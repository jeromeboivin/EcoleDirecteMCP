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
    getFamilyMessageDetail: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "family",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        messagesYear: "2025-2026",
        id: 18213,
        mailbox: "received",
        read: true,
        subject: "Re rappel.",
        contentHtml: "<div>Bonjour</div>",
        date: "2026-03-11 06:12:59",
        draft: false,
        transferred: false,
        answered: false,
        canAnswer: true,
        folderId: 0,
        dossierId: -1,
        responseId: 0,
        forwardId: 0,
        from: { id: 16, role: "P", name: "Mme C. JOSEPH" },
        to: [],
        attachmentCount: 0,
        attachments: [],
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
    getStudentProfile: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        id: 1154,
        firstName: "Antonin",
        lastName: "BOIVIN",
        fullName: "Antonin BOIVIN",
        gender: "M",
        boarderStatus: "Demi-pensionnaire",
        birthDate: "2011-11-06",
        email: "anne.roudier@free.fr",
        mobile: "0671561833",
        primarySchool: false,
        principalProfessor: false,
        classId: 18,
        classLabel: "3B",
        classIsGraded: true,
        establishmentId: 1,
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
    getStudentCahierDeTextesDay: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        date: "2026-03-12",
        subjects: [{ subject: "ESPAGNOL LV2", homeworkId: 4579, interrogation: false, blogActive: false, maxSubmissionDays: 0, homework: { homeworkId: 4579, html: "<p>Devoir</p>", onlineSubmission: false, completed: true, submittedDocumentsUploaded: false, resourceDocuments: [], documents: [], curriculumElements: [], manualLinks: [], submittedDocuments: [], tags: [], personalizedAssignments: [] }, lessonContent: { lessonId: 4579, html: "<p>Cours</p>", documents: [], curriculumElements: [], manualLinks: [] } }],
        homeworkCount: 1,
        lessonContentCount: 1,
      },
    }),
    downloadStudentCahierDeTextesAttachment: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        student: { id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B", accountId: 828, accountName: "Anne Roudier-Boivin" },
        date: "2026-03-12",
        subject: "ESPAGNOL LV2",
        homeworkId: 4579,
        attachmentKind: "homework-document",
        attachmentIndex: 0,
        attachment: { name: "Lexique.pdf", url: "https://doc1.ecoledirecte.com/lexique.pdf" },
        fileName: "Lexique.pdf",
        mimeType: "application/pdf",
        contentLength: 3,
        contentBase64: "UERG",
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
    getFamilyDocuments: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "family",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        factures: [{ id: 1 }],
        notes: [{ id: 2 }, { id: 3 }],
        viescolaire: [],
        administratifs: [{ id: 4 }],
        inscriptions: [],
        entreprises: [],
        listesPiecesAVerser: [],
        totalDocuments: 4,
      },
    }),
    listFamilyInvoices: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "family",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        invoices: [{ id: 10 }, { id: 11 }],
      },
    }),
    listAllStudents: vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: 1154, name: "Antonin Boivin", accountId: 828, accountName: "Anne Roudier-Boivin" },
      ],
    }),
    downloadFamilyDocument: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "family",
        family: { id: 828, name: "Anne Roudier-Boivin" },
        documentId: 1373,
        category: "notes",
        label: "Bulletin 1er Trimestre",
        fileName: "Note_A001.pdf",
        mimeType: "application/force-download",
        contentLength: 693133,
        contentBase64: "JVBER...",
      },
    }),
    // ── Teacher stubs ──────────────────────────────────────────
    listTeacherMessages: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
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
    getTeacherEmploiDuTemps: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        days: [],
        totalEvents: 0,
      },
    }),
    listTeacherClasses: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        classes: [{ id: 85, code: "3PA", label: "3ème Prépa Apprenti" }],
      },
    }),
    getTeacherClassStudents: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "class",
        teacher: { id: 221, name: "Mme D. PROF" },
        class: { id: 85, name: "3ème Prépa Apprenti" },
        students: [{ id: 101, name: "Alice DUPONT" }],
      },
    }),
    listTeacherRooms: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        rooms: [{ id: 1, code: "S101", label: "Salle 101", reservable: true }],
      },
    }),
    getTeacherNoteSettings: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        components: [{ code: "ECRIT", label: "Écrit" }],
        homeworkTypes: [{ code: "DS", label: "Devoir surveillé" }],
        establishmentParams: [],
      },
    }),
    getTeacherGradebookCatalog: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        establishments: [
          {
            id: 6,
            code: "LP",
            label: "Lycée Pro",
            classes: [{ id: 85, code: "3PA", typeEntity: "C", isPP: true, periods: [] }],
            groups: [],
          },
        ],
        attendanceGrid: [{ start: "08:00", end: "08:55" }],
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

  it("registers get_family_message_detail and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_family_message_detail")!({
      messageId: 18213,
      messagesYear: "2025-2026",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Loaded family message "Re rappel."');
    expect(result.content[0].text).toContain("Mme C. JOSEPH");
    expect(data.getFamilyMessageDetail).toHaveBeenCalledWith({
      messageId: 18213,
      messagesYear: "2025-2026",
    });
  });

  it("registers list_student_messages and passes through arguments", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("list_student_messages")!({ students: [{ studentId: 1154 }], mailbox: "received" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Antonin Boivin");
    expect(data.listStudentMessages).toHaveBeenCalledWith(expect.objectContaining({ studentId: 1154, mailbox: "received" }));
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

    const result = await server.handlers.get("get_student_notes")!({ students: [{ studentId: 1154 }] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Multiple students");
    expect(result.content[0].text).toContain("availableStudents");
  });

  it("registers the extended student data tools", async () => {
    const server = stubServer();
    registerDataTools(server as any, stubData() as any);

    expect(server.handlers.has("get_student_profile")).toBe(true);
    expect(server.handlers.has("get_student_cahier_de_textes")).toBe(true);
    expect(server.handlers.has("get_student_cahier_de_textes_day")).toBe(true);
    expect(server.handlers.has("download_student_cahier_de_textes_attachment")).toBe(true);
    expect(server.handlers.has("get_family_message_detail")).toBe(true);
    expect(server.handlers.has("get_student_vie_scolaire")).toBe(true);
    expect(server.handlers.has("list_student_carnet_correspondance")).toBe(true);
    expect(server.handlers.has("list_student_sessions_rdv")).toBe(true);
    expect(server.handlers.has("get_class_vie_de_la_classe")).toBe(true);
    expect(server.handlers.has("get_student_emploi_du_temps")).toBe(true);
    expect(server.handlers.has("get_family_documents")).toBe(true);
    expect(server.handlers.has("list_family_invoices")).toBe(true);
  });

  it("registers get_student_cahier_de_textes and passes through arguments", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_cahier_de_textes")!({ students: [{ studentId: 1154 }], date: "2026-03-12" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("homework assignments");
    expect(data.getStudentCahierDeTextes).toHaveBeenCalledWith(expect.objectContaining({ studentId: 1154, date: "2026-03-12" }));
  });

  it("registers get_student_profile and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_profile")!({ students: [{ studentId: 1154 }] });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Profile for Antonin BOIVIN in 3B.");
    expect(data.getStudentProfile).toHaveBeenCalledWith(expect.objectContaining({ studentId: 1154 }));
  });

  it("registers get_student_cahier_de_textes_day and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_cahier_de_textes_day")!({ students: [{ studentId: 1154 }], date: "2026-03-12" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("homework entries and 1 lesson content entries");
    expect(result.content[0].text).toContain("2026-03-12");
    expect(data.getStudentCahierDeTextesDay).toHaveBeenCalledWith(expect.objectContaining({ studentId: 1154, date: "2026-03-12" }));
  });

  it("registers download_student_cahier_de_textes_attachment and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("download_student_cahier_de_textes_attachment")!({
      studentId: 1154,
      date: "2026-03-12",
      homeworkId: 4579,
      attachmentKind: "homework-document",
      attachmentIndex: 0,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Downloaded homework-document Lexique.pdf");
    expect(result.content[0].text).toContain("Antonin Boivin");
    expect(data.downloadStudentCahierDeTextesAttachment).toHaveBeenCalledWith({
      studentId: 1154,
      date: "2026-03-12",
      homeworkId: 4579,
      attachmentKind: "homework-document",
      attachmentIndex: 0,
    });
  });

  it("registers get_class_vie_de_la_classe and summarizes empty responses", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_class_vie_de_la_classe")!({ students: [{ studentId: 1154 }] });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("No vie de la classe sections are available");
    expect(data.getClassVieDeLaClasse).toHaveBeenCalledWith(expect.objectContaining({ studentId: 1154 }));
  });

  it("registers get_student_emploi_du_temps and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_emploi_du_temps")!({ students: [{ studentId: 1154 }] });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("timetable events");
    expect(result.content[0].text).toContain("Antonin Boivin");
    expect(data.getStudentEmploiDuTemps).toHaveBeenCalledWith(expect.objectContaining({ studentId: 1154 }));
  });

  it("registers get_family_documents and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_family_documents")!({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("4 documents");
    expect(result.content[0].text).toContain("3 categories");
    expect(result.content[0].text).toContain("Anne Roudier-Boivin");
    expect(data.getFamilyDocuments).toHaveBeenCalled();
  });

  it("registers download_family_document and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("download_family_document")!({
      documentId: 1373,
      category: "notes",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Downloaded notes document");
    expect(result.content[0].text).toContain("Note_A001.pdf");
    expect(result.content[0].text).toContain("Anne Roudier-Boivin");
    expect(data.downloadFamilyDocument).toHaveBeenCalledWith({
      documentId: 1373,
      category: "notes",
    });
  });

  it("registers list_family_invoices and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("list_family_invoices")!({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("2 invoices");
    expect(result.content[0].text).toContain("Anne Roudier-Boivin");
    expect(data.listFamilyInvoices).toHaveBeenCalled();
  });

  it("resolves all students when students param is omitted", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_notes")!({});

    expect(result.isError).toBe(false);
    expect(data.listAllStudents).toHaveBeenCalled();
    expect(data.getStudentNotes).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 1154, accountId: 828 }),
    );
  });

  it("queries multiple students sequentially", async () => {
    const callOrder: number[] = [];
    const server = stubServer();
    const data = stubData({
      getStudentNotes: vi.fn()
        .mockImplementation(async (query: { studentId: number }) => {
          callOrder.push(query.studentId);
          return {
            ok: true,
            data: {
              scope: "student",
              family: { id: 828, name: "Anne Roudier-Boivin" },
              student: { id: query.studentId, name: `Student ${query.studentId}`, accountId: 828, accountName: "Anne Roudier-Boivin" },
              settings: {},
              periods: [],
              grades: [{ id: query.studentId }],
              expired: false,
            },
          };
        }),
    });
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_student_notes")!({
      students: [{ studentId: 1154 }, { studentId: 15902 }],
    });

    expect(result.isError).toBe(false);
    expect(callOrder).toEqual([1154, 15902]);
    expect(data.getStudentNotes).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toContain("---");
  });

  // ── Teacher tools ──────────────────────────────────────────

  it("registers all teacher tools", () => {
    const server = stubServer();
    registerDataTools(server as any, stubData() as any);

    expect(server.handlers.has("list_teacher_messages")).toBe(true);
    expect(server.handlers.has("get_teacher_emploi_du_temps")).toBe(true);
    expect(server.handlers.has("list_teacher_classes")).toBe(true);
    expect(server.handlers.has("get_teacher_class_students")).toBe(true);
    expect(server.handlers.has("list_teacher_rooms")).toBe(true);
    expect(server.handlers.has("get_teacher_note_settings")).toBe(true);
    expect(server.handlers.has("get_teacher_gradebook_catalog")).toBe(true);
  });

  it("registers get_teacher_gradebook_catalog and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_gradebook_catalog")!({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Gradebook catalog for Mme D. PROF");
    expect(result.content[0].text).toContain("1 establishment(s)");
    expect(result.content[0].text).toContain("1 class(es)");
    expect(data.getTeacherGradebookCatalog).toHaveBeenCalled();
  });

  it("registers list_teacher_classes and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("list_teacher_classes")!({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("1 class(es)");
    expect(result.content[0].text).toContain("Mme D. PROF");
    expect(data.listTeacherClasses).toHaveBeenCalled();
  });

  it("registers get_teacher_note_settings and formats the summary", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_note_settings")!({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Note settings loaded for Mme D. PROF");
    expect(result.content[0].text).toContain("1 components");
    expect(data.getTeacherNoteSettings).toHaveBeenCalled();
  });
});