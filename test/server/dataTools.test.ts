import { beforeEach, describe, expect, it, vi } from "vitest";

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

function stubServer(): { handlers: Map<string, ToolHandler>; tool: (...args: unknown[]) => void } {
  const handlers = new Map<string, ToolHandler>();
  return {
    handlers,
    tool: (name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    },
  };
}

function stubData(overrides?: Partial<Record<string, unknown>>) {
  return {
    listFamilyMessages: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "family",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        mailbox: "received",
        page: 0,
        itemsPerPage: 100,
        query: "",
        folders: [],
        messages: [],
        pagination: {},
        settings: { recipients: {} },
      },
    }),
    listStudentMessages: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", accountId: 828, accountName: "Anne Roudier-Boivin" },
        mailbox: "received",
        page: 0,
        itemsPerPage: 100,
        query: "",
        folders: [],
        messages: [{ id: 1 }],
        pagination: {},
        settings: { recipients: {} },
      },
    }),
    getStudentNotes: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", accountId: 828, accountName: "Anne Roudier-Boivin" },
        settings: {},
        periods: [{ id: "P1", label: "Trimestre 1", annual: false, closed: true, exam: false }],
        grades: [{ id: 1 }],
        expired: false,
      },
    }),
    ...overrides,
  };
}

async function loadRegisterDataTools() {
  const mod = await import("../../src/server/dataTools.js");
  return mod.registerDataTools;
}

describe("MCP data tools", () => {
  let registerDataTools: Awaited<ReturnType<typeof loadRegisterDataTools>>;

  beforeEach(async () => {
    registerDataTools = await loadRegisterDataTools();
  });

  it("registers list_family_messages and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("list_family_messages")!({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("family messages");
    expect(result.content[0].text).toContain("Anne Roudier-Boivin");
    expect(data.listFamilyMessages).toHaveBeenCalled();
  });

  it("registers list_student_messages and passes through arguments", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("list_student_messages")!({ studentId: 1154, mailbox: "received" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Antonin Boivin");
    expect(data.listStudentMessages).toHaveBeenCalledWith({ studentId: 1154, mailbox: "received" });
  });

  it("returns an error payload when student notes fail", async () => {
    const server = stubServer();
    const data = stubData({
      getStudentNotes: vi.fn().mockResolvedValue({
        ok: false,
        error: "Multiple students are available. Retry with studentId or accountId.",
        recoverable: true,
        availableStudents: [{ id: 1154, name: "Antonin Boivin", accountId: 828, accountName: "Anne Roudier-Boivin" }],
      }),
    });
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_notes")!({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Multiple students");
    expect(result.content[0].text).toContain("availableStudents");
  });
});