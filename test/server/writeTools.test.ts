import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { expect, it, vi } from "vitest";
import type { AuthService } from "../../src/ecoledirecte/auth/service.js";
import { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import { EdWriteService } from "../../src/ecoledirecte/write/service.js";
import { registerWriteTools } from "../../src/server/writeTools.js";

it("exposes preview and an explicitly confirmed one-shot write over MCP", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ code: 200, data: { id: 10 } }));
  vi.stubGlobal("fetch", fetchMock);
  const http = new EdHttpClient();
  http.setToken("fake-token");
  const state = { status: "authenticated", accounts: [{ id: 1, type: "P", current: true, name: "Test teacher" }] };
  const auth = { getState: () => state, getActiveProfile: () => undefined } as unknown as AuthService;
  const server = new McpServer({ name: "test-server", version: "1.0.0" });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  registerWriteTools(server, new EdWriteService(http, auth, true));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const previewName = "prepare_ecoledirecte_write";
    const executeName = "execute_ecoledirecte_write";
    const { tools } = await client.listTools();
    expect(tools.find(({ name }) => name === previewName)?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find(({ name }) => name === executeName)?.annotations).toMatchObject({ readOnlyHint: false, idempotentHint: false });
    const schema = JSON.stringify(tools.find(({ name }) => name === previewName)?.inputSchema);
    expect(schema).toContain("create_gradebook_evaluation");
    expect(schema).toContain("save_gradebook_notes");
    const capabilities = await client.callTool({ name: "list_ecoledirecte_write_capabilities", arguments: {} });
    expect(capabilities.isError).toBe(false);
    expect(JSON.parse((capabilities.content as { text: string }[])[0].text)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "manage_quiz", actions: expect.arrayContaining(["associate", "start", "stop"]) }),
      expect.objectContaining({ kind: "submit_class_attendance" }),
    ]));
    expect(fetchMock).not.toHaveBeenCalled();
    const preview = await client.callTool({ name: previewName, arguments: {
      operation: { kind: "send_message", accountId: 1, subject: "Test", text: "Test message", recipients: [{ id: 2, role: "P" }] },
    } });
    expect(preview.isError).toBe(false);
    const [{ text }] = preview.content as { text: string }[];
    const { planId } = JSON.parse(text);
    const unconfirmed = await client.callTool({ name: executeName, arguments: { planId, confirm: false } });
    expect(unconfirmed.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const sent = await client.callTool({ name: executeName, arguments: { planId, confirm: true } });
    expect(sent.isError).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  } finally {
    await client.close();
    await server.close();
    vi.unstubAllGlobals();
  }
});
