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
    getStudentCahierDeTextes: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        days: [{ date: "2026-03-12", assignments: [{ homeworkId: 1, subject: "Mathématiques", dueDate: "2026-03-12", toDo: true, documentsToDo: false, completed: false, interrogation: false, onlineSubmission: false, tags: [] }] }],
        totalAssignments: 1,
      },
    }),
    getStudentVieScolaire: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        absencesRetards: [{ id: 1 }],
        dispenses: [],
        sanctionsEncouragements: [{ id: 2 }],
        settings: {},
      },
    }),
    listStudentCarnetCorrespondance: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        correspondences: [{ content: "Signature demandée", signatureRequired: true }],
        followUps: [],
      },
    }),
    listStudentSessionsRdv: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        sessions: [{ id: 1 }],
        authors: [],
        invitees: [],
        unavailableInvitees: [],
      },
    }),
    getClassVieDeLaClasse: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "class",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        class: { id: 18, name: "3B", code: "3B" },
        sections: {},
        sectionKeys: [],
        empty: true,
      },
    }),
    getStudentEmploiDuTemps: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        days: [{ date: "2026-03-12", events: [{ id: 1, label: "Mathématiques" }] }],
        totalEvents: 1,
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

  it("registers the extended student data tools", async () => {
    const server = stubServer();
    registerDataTools(server as any, stubData() as any);

    expect(server.handlers.has("get_student_cahier_de_textes")).toBe(true);
    expect(server.handlers.has("get_student_vie_scolaire")).toBe(true);
    expect(server.handlers.has("list_student_carnet_correspondance")).toBe(true);
    expect(server.handlers.has("list_student_sessions_rdv")).toBe(true);
    expect(server.handlers.has("get_class_vie_de_la_classe")).toBe(true);
    expect(server.handlers.has("get_student_emploi_du_temps")).toBe(true);
  });

  it("registers get_student_cahier_de_textes and passes through arguments", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_cahier_de_textes")!({ studentId: 1154, date: "2026-03-12" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("homework assignments");
    expect(data.getStudentCahierDeTextes).toHaveBeenCalledWith({ studentId: 1154, date: "2026-03-12" });
  });

  it("registers get_class_vie_de_la_classe and summarizes empty responses", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_class_vie_de_la_classe")!({ studentId: 1154 });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("No vie de la classe sections are available");
    expect(data.getClassVieDeLaClasse).toHaveBeenCalledWith({ studentId: 1154 });
  });

  it("registers get_student_emploi_du_temps and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_emploi_du_temps")!({ studentId: 1154 });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("timetable events");
    expect(result.content[0].text).toContain("Antonin Boivin");
    expect(data.getStudentEmploiDuTemps).toHaveBeenCalledWith({ studentId: 1154 });
  });
});