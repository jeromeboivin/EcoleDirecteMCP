import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthState } from "../../src/ecoledirecte/auth/types.js";

/**
 * Test the tool-result formatting logic without needing a real McpServer.
 * We import the formatter indirectly through a module-level extraction.
 *
 * Since the formatState function is private to tools.ts, we test through
 * the public registerTools + a lightweight McpServer stub.
 */

// Lightweight McpServer stub that captures registered tool handlers.
type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

function stubServer(): { handlers: Map<string, ToolHandler>; tool: (...args: unknown[]) => void } {
  const handlers = new Map<string, ToolHandler>();
  return {
    handlers,
    tool: (...args: unknown[]) => {
      const [name, _desc, _schema, handler] = args as [string, unknown, unknown, ToolHandler];
      handlers.set(name, handler);
    },
  };
}

// Minimal AuthService stub.
function stubAuth(state: AuthState) {
  return {
    getState: () => state,
    getActiveProfile: () => undefined as string | undefined,
    setActiveProfile: vi.fn().mockResolvedValue(undefined),
    listProfiles: vi.fn().mockResolvedValue({ profiles: [] }),
    login: vi.fn().mockResolvedValue(state),
    loginFromStore: vi.fn().mockResolvedValue(state),
    submitTotp: vi.fn().mockResolvedValue(state),
    submitDoubleAuthChoice: vi.fn().mockResolvedValue(state),
    importSession: vi.fn().mockResolvedValue(state),
    validateSession: vi.fn().mockResolvedValue(state),
    logout: vi.fn().mockResolvedValue({ status: "logged-out" } as AuthState),
    logoutFull: vi.fn().mockResolvedValue({ status: "logged-out" } as AuthState),
    restore: vi.fn().mockResolvedValue(state),
  };
}

// Dynamic import to keep ESM happy with the stubs.
async function loadRegisterTools() {
  const mod = await import("../../src/server/tools.js");
  return mod.registerTools;
}

describe("MCP tool responses", () => {
  let registerTools: Awaited<ReturnType<typeof loadRegisterTools>>;

  beforeEach(async () => {
    registerTools = await loadRegisterTools();
  });

  it("auth_status formats authenticated state", async () => {
    const state: AuthState = {
      status: "authenticated",
      token: "tok",
      accounts: [{ id: 1, type: "E", name: "Jane Doe", current: true, establishment: "Lycee" }],
    };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("auth_status")!;
    const result = await handler({});

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Authenticated");
    expect(result.content[0].text).toContain("Jane Doe");
    expect(result.content[0].text).toContain("current account");
  });

  it("auth_status formats logged-out state", async () => {
    const state: AuthState = { status: "logged-out" };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("auth_status")!;
    const result = await handler({});

    expect(result.content[0].text).toContain("Not authenticated");
  });

  it("auth_status formats error state with recoverable flag", async () => {
    const state: AuthState = { status: "error", message: "Session expired", recoverable: true };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("auth_status")!;
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Session expired");
    expect(result.content[0].text).toContain("recoverable");
  });

  it("auth_status formats session-imported state", async () => {
    const state: AuthState = { status: "session-imported", token: "tok" };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("auth_status")!;
    const result = await handler({});

    expect(result.content[0].text).toContain("Session imported");
  });

  it("auth_status formats doubleauth-required state", async () => {
    const state: AuthState = {
      status: "doubleauth-required",
      question: "Quelle est l'année ?",
      choices: [
        { label: "2011", value: "encoded-1" },
        { label: "2012", value: "encoded-2" },
      ],
    };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("auth_status")!;
    const result = await handler({});

    expect(result.content[0].text).toContain("Quelle est l'année ?");
    expect(result.content[0].text).toContain("submit_doubleauth");
  });

  it("validate_session tool is registered and calls service", async () => {
    const state: AuthState = { status: "authenticated", token: "tok", accounts: [] };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("validate_session")!;
    expect(handler).toBeDefined();

    const result = await handler({});
    expect(auth.validateSession).toHaveBeenCalled();
    expect(result.content[0].text).toContain("Authenticated");
  });

  it("login tool is parameterless and invokes auth.loginFromStore", async () => {
    const state: AuthState = {
      status: "authenticated",
      token: "tok",
      accounts: [{ id: 1, type: "E", name: "Test" }],
    };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("login")!;
    const result = await handler({});

    expect(auth.loginFromStore).toHaveBeenCalled();
    expect(result.content[0].text).toContain("Authenticated");
  });

  it("submit_doubleauth invokes auth.submitDoubleAuthChoice", async () => {
    const state: AuthState = {
      status: "authenticated",
      token: "tok",
      accounts: [{ id: 1, type: "E", name: "Test" }],
    };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("submit_doubleauth")!;
    const result = await handler({ choiceIndex: 2 });

    expect(auth.submitDoubleAuthChoice).toHaveBeenCalledWith(2);
    expect(result.content[0].text).toContain("Authenticated");
  });

  it("logout tool resets to logged-out", async () => {
    const state: AuthState = { status: "authenticated", token: "tok", accounts: [] };
    const server = stubServer();
    const auth = stubAuth(state);
    registerTools(server as any, auth as any);

    const handler = server.handlers.get("logout")!;
    const result = await handler({});

    expect(auth.logout).toHaveBeenCalled();
    expect(result.content[0].text).toContain("Not authenticated");
  });
});
