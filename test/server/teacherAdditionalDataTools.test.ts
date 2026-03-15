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

function stubData() {
  return {
    getTeacherMessageDetail: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        messagesYear: "2025-2026",
        id: 50507,
        mailbox: "received",
        read: true,
        subject: "Direct'édito N°12",
        contentHtml: "<div>Bonjour</div>",
        date: "2026-03-13 13:40:14",
        draft: false,
        transferred: false,
        answered: false,
        canAnswer: true,
        folderId: 0,
        dossierId: -1,
        from: { id: 254, role: "A", name: "Mme Sarah LAGRINI" },
        to: [],
        attachmentCount: 1,
        attachments: [{ id: 9528, name: "Direct_edito.pdf" }],
      },
    }),
    getTeacherClassCarnetCorrespondance: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "class",
        teacher: { id: 221, name: "Mme D. PROF" },
        class: { id: 67, name: "Terminale A", code: "TA" },
        students: [{ id: 3721, name: "Duran ERDOGAN" }],
        studentCount: 1,
        showAll: false,
        correspondenceTypes: [{ id: 1, label: "Information" }],
        sanctionTypes: [],
        sanctionReasons: [],
        incidentReasons: [],
        followUpCategories: [],
        correspondences: [{ content: "Information aux familles", signatureRequired: true }],
        correspondenceCount: 1,
        disciplinaryRequests: [{ id: 6 }],
        disciplinaryRequestCount: 1,
        followUps: [{ id: 7 }],
        followUpCount: 1,
        settings: {},
      },
    }),
    getTeacherStudentCarnetCorrespondance: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        teacher: { id: 221, name: "Mme D. PROF" },
        student: { id: 3721, name: "Duran ERDOGAN", classId: 67, className: "Terminale A" },
        profile: { id: 3721, fullName: "Duran ERDOGAN" },
        carnet: { correspondences: [{ id: 1 }], followUps: [{ id: 7 }] },
        schoolLife: { absencesRetards: [{ id: 1 }], dispenses: [], sanctionsEncouragements: [], settings: {} },
        sessionsRdv: { sessions: [{ id: 1 }], authors: [], invitees: [], unavailableInvitees: [] },
      },
    }),
    getTeacherCahierDeTextes: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        dateDebut: "2026-01-26",
        dateFin: "2026-05-03",
        selectedEntityId: 67,
        selectedEntityType: "C",
        selectedSubjectCode: "FRANC",
        slots: [{ courseId: 101, entityLabel: "Terminale A", subjectLabel: "FRANCAIS", hasHomework: true, hasLessonContent: true }],
        slotCount: 1,
        homeworkCount: 1,
        lessonContentCount: 1,
      },
    }),
    listTeacherLslClasses: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        classes: [{ id: 67, label: "Terminale A", principalProfessor: true, isTerminalClass: true, isGeneralOrTechno: true, isTechno: false, isProfessional: false, studentCount: 1, subjectCount: 1, students: [{ id: 4018, name: "Gulseren BASAGAC", subjectCount: 1 }], subjects: [{ code: "010300", label: "PHILOSOPHIE", competencyCount: 1 }] }],
        appreciations: [{ code: "FicheAvenir", label: "fiche Avenir", maxCharacters: 600 }],
        examOpinions: [{ code: "T", label: "Très favorable" }],
        schoolEngagements: [{ code: "NE", label: "Eco-délégué" }],
        detailedSchoolEngagements: [{ code: "NC", label: "Délégué de classe" }],
        notations: [{ code: "-1", label: "Aucune évaluation" }],
        headTeacherOnlyExamOpinion: true,
        principalProfessorOnlyEngagements: false,
      },
    }),
    getTeacherLslStudentDetail: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "teacher",
        teacher: { id: 221, name: "Mme D. PROF" },
        class: { id: 67, label: "Terminale A", principalProfessor: true, isTerminalClass: true, isGeneralOrTechno: true, isTechno: false, isProfessional: false, studentCount: 1, subjectCount: 1, subjects: [{ code: "010300", label: "PHILOSOPHIE", competencyCount: 1 }] },
        student: { id: 4018, name: "Gulseren BASAGAC", examOpinions: [{ code: "T" }], schoolEngagements: [{ code: "NE", active: false }], detailedSchoolEngagements: [{ code: "NC", active: true }], subjects: [{ code: "010300", annualAppreciation: "Bravo" }], subjectCount: 1 },
        appreciations: [{ code: "FicheAvenir", label: "fiche Avenir", maxCharacters: 600 }],
        examOpinions: [{ code: "T", label: "Très favorable" }],
        schoolEngagements: [{ code: "NE", label: "Eco-délégué" }],
        detailedSchoolEngagements: [{ code: "NC", label: "Délégué de classe" }],
        notations: [{ code: "-1", label: "Aucune évaluation" }],
        headTeacherOnlyExamOpinion: true,
        principalProfessorOnlyEngagements: false,
      },
    }),
    getTeacherStudentNotes: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scope: "student",
        teacher: { id: 221, name: "Mme D. PROF" },
        student: { id: 4318, name: "Thaïs BOUYSSET", classId: 85, className: "Premiere C" },
        settings: { studentAverage: true, classAverage: true, generalAverage: true },
        periods: [
          {
            id: "P2",
            label: "Trimestre 2",
            code: "A002",
            annual: false,
            closed: false,
            exam: false,
            generalAverage: "13.5",
            disciplines: [
              {
                id: 201,
                code: "FRANC",
                name: "Français",
                average: "14.0",
                teachers: [{ id: 221, name: "Mme ROUDIER BOIVIN" }],
                appreciations: ["Élève sérieuse."],
                isGroup: false,
                isOption: false,
                isSubSubject: false,
              },
            ],
            appreciationPP: "Trimestre satisfaisant.",
          },
        ],
        grades: [
          { id: 500, assignment: "DS", subject: "Français", value: "15" },
        ],
        expired: false,
      },
    }),
  };
}

async function loadRegisterDataTools() {
  const mod = await import("../../src/server/dataTools.js");
  return mod.registerDataTools;
}

describe("additional teacher MCP data tools", () => {
  let registerDataTools: Awaited<ReturnType<typeof loadRegisterDataTools>>;

  beforeEach(async () => {
    registerDataTools = await loadRegisterDataTools();
  });

  it("registers the additional teacher tools", () => {
    const server = stubServer();
    registerDataTools(server as any, stubData() as any);

    expect(server.handlers.has("get_teacher_message_detail")).toBe(true);
    expect(server.handlers.has("get_teacher_class_carnet_correspondance")).toBe(true);
    expect(server.handlers.has("get_teacher_student_carnet_correspondance")).toBe(true);
    expect(server.handlers.has("get_teacher_cahier_de_textes")).toBe(true);
    expect(server.handlers.has("list_teacher_lsl_classes")).toBe(true);
    expect(server.handlers.has("get_teacher_lsl_student_detail")).toBe(true);
    expect(server.handlers.has("get_teacher_student_notes")).toBe(true);
  });

  it("formats teacher message detail results", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_message_detail")!({ messageId: 50507, messagesYear: "2025-2026" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Loaded teacher message "Direct\'édito N°12"');
    expect(result.content[0].text).toContain("Mme Sarah LAGRINI");
    expect(data.getTeacherMessageDetail).toHaveBeenCalledWith({ messageId: 50507, messagesYear: "2025-2026" });
  });

  it("formats teacher class carnet correspondance results", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_class_carnet_correspondance")!({ classId: 67 });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Teacher carnet de correspondance for Terminale A");
    expect(result.content[0].text).toContain("1 student(s), 1 correspondence entry, 1 request(s), and 1 follow-up(s)");
    expect(data.getTeacherClassCarnetCorrespondance).toHaveBeenCalledWith({ classId: 67 });
  });

  it("formats teacher student carnet correspondance results", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_student_carnet_correspondance")!({ studentId: 3721 });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Teacher student carnet detail for Duran ERDOGAN");
    expect(result.content[0].text).toContain("1 correspondence entry, 1 follow-up(s), 1 absence(s) or retard(s), and 1 appointment session(s)");
    expect(data.getTeacherStudentCarnetCorrespondance).toHaveBeenCalledWith({ studentId: 3721 });
  });

  it("formats teacher cahier de textes results", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_cahier_de_textes")!({ dateDebut: "2026-01-26", dateFin: "2026-05-03", entityId: 67, entityType: "C", subjectCode: "FRANC" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Teacher cahier de textes for Mme D. PROF");
    expect(result.content[0].text).toContain("1 slot(s), 1 with homework, and 1 with lesson content");
    expect(data.getTeacherCahierDeTextes).toHaveBeenCalledWith({ dateDebut: "2026-01-26", dateFin: "2026-05-03", entityId: 67, entityType: "C", subjectCode: "FRANC" });
  });

  it("formats teacher LSL list and detail results", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const listResult = await server.handlers.get("list_teacher_lsl_classes")!({});
    expect(listResult.isError).toBe(false);
    expect(listResult.content[0].text).toContain("Teacher LSL / Parcoursup classes for Mme D. PROF");
    expect(listResult.content[0].text).toContain("1 class(es), 1 student(s), and 1 notation label(s)");
    expect(data.listTeacherLslClasses).toHaveBeenCalled();

    const detailResult = await server.handlers.get("get_teacher_lsl_student_detail")!({ classId: 67, studentId: 4018 });
    expect(detailResult.isError).toBe(false);
    expect(detailResult.content[0].text).toContain("Teacher LSL / Parcoursup student detail for Gulseren BASAGAC");
    expect(detailResult.content[0].text).toContain("1 subject(s), 1 exam opinion entry, 2 engagement entries, in Terminale A");
    expect(data.getTeacherLslStudentDetail).toHaveBeenCalledWith({ classId: 67, studentId: 4018 });
  });

  it("formats teacher student notes results", async () => {
    const server = stubServer();
    const data = stubData();
    registerDataTools(server as any, data as any);

    const result = await server.handlers.get("get_teacher_student_notes")!({ studentId: 4318 });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("1 grades across 1 periods (1 subject disciplines) for Thaïs BOUYSSET");
    expect(result.content[0].text).toContain('"appreciationPP": "Trimestre satisfaisant."');
    expect(data.getTeacherStudentNotes).toHaveBeenCalledWith({ studentId: 4318 });
  });
});