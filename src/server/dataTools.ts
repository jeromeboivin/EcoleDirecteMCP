import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  ClassVieDeLaClasseResult,
  DataFailure,
  DataResult,
  EdDataService,
  FamilyDocumentDownloadResult,
  FamilyDocumentsResult,
  FamilyInvoicesResult,
  FamilyMessageDetailResult,
  FamilyMessagesResult,
  StudentCahierDeTextesAttachmentResult,
  StudentCahierDeTextesResult,
  StudentCahierDeTextesDayResult,
  StudentCarnetCorrespondanceResult,
  StudentEmploiDuTempsResult,
  StudentMessagesResult,
  StudentNotesResult,
  StudentProfileResult,
  StudentSessionsRdvResult,
  StudentVieScolaireResult,
  TeacherClassStudentsResult,
  TeacherEmploiDuTempsResult,
  TeacherMessagesResult,
  TeacherNoteSettingsResult,
  TeacherRoomsResult,
} from "../ecoledirecte/data/service.js";
import { log } from "../ecoledirecte/logging.js";

// ── Schemas ────────────────────────────────────────────────────

const messageFieldsSchema = {
  mailbox: z.enum(["received", "sent", "archived", "draft"]).optional(),
  folderId: z.number().int().min(0).optional(),
  query: z.string().optional(),
  page: z.number().int().min(0).optional(),
  itemsPerPage: z.number().int().min(1).max(100).optional(),
};

const messageQuerySchema = {
  accountId: z.number().int().positive().optional(),
  ...messageFieldsSchema,
};

const familyMessageDetailQuerySchema = {
  accountId: z.number().int().positive().optional(),
  messageId: z.number().int().positive(),
  messagesYear: z.string().optional(),
};

const studentTargetSchema = z.object({
  studentId: z.number().int().positive(),
  accountId: z.number().int().positive().optional(),
});

const studentsSchema = {
  students: z.array(studentTargetSchema).optional(),
};

const singleStudentQuerySchema = {
  accountId: z.number().int().positive().optional(),
  studentId: z.number().int().positive().optional(),
};

const cahierDeTextesAttachmentQuerySchema = {
  ...singleStudentQuerySchema,
  date: z.string(),
  homeworkId: z.number().int().positive(),
  attachmentKind: z.enum([
    "homework-resource",
    "homework-document",
    "homework-submitted",
    "lesson-document",
  ]),
  attachmentIndex: z.number().int().min(0),
};

const familyDocumentDownloadQuerySchema = {
  accountId: z.number().int().positive().optional(),
  documentId: z.number().int().positive(),
  category: z.enum([
    "factures",
    "notes",
    "viescolaire",
    "administratifs",
    "inscriptions",
    "entreprises",
  ]),
};

const teacherQuerySchema = {
  accountId: z.number().int().positive().optional(),
};

const teacherMessageFieldsSchema = {
  ...teacherQuerySchema,
  ...messageFieldsSchema,
};

const teacherEmploiDuTempsQuerySchema = {
  ...teacherQuerySchema,
  dateDebut: z.string(),
  dateFin: z.string(),
};

const teacherClassStudentsQuerySchema = {
  ...teacherQuerySchema,
  classId: z.number().int().positive(),
};

// ── Serialization ──────────────────────────────────────────────

let pending: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = pending.then(() => fn());
  pending = next.then(
    () => {},
    () => {},
  );
  return next;
}

// ── Multi-student helpers ──────────────────────────────────────

interface StudentTarget {
  studentId: number;
  accountId?: number;
}

type McpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

async function resolveStudentTargets(
  data: EdDataService,
  students?: StudentTarget[],
): Promise<DataResult<StudentTarget[]>> {
  if (students && students.length > 0) {
    return { ok: true, data: students };
  }
  const all = await data.listAllStudents();
  if (!all.ok) return all;
  return {
    ok: true,
    data: all.data.map((s) => ({ studentId: s.id, accountId: s.accountId })),
  };
}

async function forEachStudent(
  data: EdDataService,
  students: StudentTarget[] | undefined,
  callAndFormat: (target: StudentTarget) => Promise<McpToolResult>,
): Promise<McpToolResult> {
  const targets = await resolveStudentTargets(data, students);
  if (!targets.ok) return failureResult(targets);

  const parts: string[] = [];
  let anySuccess = false;

  for (const target of targets.data) {
    const result = await callAndFormat(target);
    parts.push(result.content[0].text);
    if (!result.isError) anySuccess = true;
  }

  return {
    content: [{ type: "text" as const, text: parts.join("\n\n---\n\n") }],
    isError: !anySuccess,
  };
}

// ── Tool registration ──────────────────────────────────────────

export function registerDataTools(server: McpServer, data: EdDataService): void {
  server.tool(
    "get_family_documents",
    "Get family-level documents grouped by category (factures, notes, vie scolaire, administratifs, inscriptions, entreprises)",
    { accountId: z.number().int().positive().optional() },
    async (args) => serialize(async () => {
      log("info", "get_family_documents tool invoked");
      const result = await data.getFamilyDocuments(args);
      return resultForFamilyDocuments(result);
    }),
  );

  server.tool(
    "download_family_document",
    "Download a family document (bulletin, certificat, facture, etc.) by its id and category. Use get_family_documents first to list available documents.",
    familyDocumentDownloadQuerySchema,
    async (args) => serialize(async () => {
      log("info", "download_family_document tool invoked");
      const result = await data.downloadFamilyDocument(args);
      return resultForFamilyDocumentDownload(result);
    }),
  );

  server.tool(
    "list_family_invoices",
    "List family-level invoices and signature documents",
    { accountId: z.number().int().positive().optional() },
    async (args) => serialize(async () => {
      log("info", "list_family_invoices tool invoked");
      const result = await data.listFamilyInvoices(args);
      return resultForFamilyInvoices(result);
    }),
  );

  server.tool(
    "list_family_messages",
    "List family-level messages for the authenticated EcoleDirecte family account",
    messageQuerySchema,
    async (args) => serialize(async () => {
      log("info", "list_family_messages tool invoked");
      const result = await data.listFamilyMessages(args);
      return resultForFamilyMessages(result);
    }),
  );

  server.tool(
    "get_family_message_detail",
    "Get the full content of a selected family message. This mirrors opening the message in EcoleDirecte and may mark it as read.",
    familyMessageDetailQuerySchema,
    async (args) => serialize(async () => {
      log("info", "get_family_message_detail tool invoked");
      const result = await data.getFamilyMessageDetail(args);
      return resultForFamilyMessageDetail(result);
    }),
  );

  server.tool(
    "list_student_messages",
    "List student-level messages for one or more students. Omit students to query all known students sequentially.",
    { ...studentsSchema, ...messageFieldsSchema },
    async (args) => serialize(async () => {
      log("info", "list_student_messages tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentMessages(
          await data.listStudentMessages({
            ...t,
            mailbox: args.mailbox,
            folderId: args.folderId,
            query: args.query,
            page: args.page,
            itemsPerPage: args.itemsPerPage,
          }),
        ),
      );
    }),
  );

  server.tool(
    "get_student_notes",
    "Get student notes and period averages for one or more students. Omit students to query all known students sequentially.",
    { ...studentsSchema, periodCode: z.string().optional() },
    async (args) => serialize(async () => {
      log("info", "get_student_notes tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentNotes(
          await data.getStudentNotes({ ...t, periodCode: args.periodCode }),
        ),
      );
    }),
  );

  server.tool(
    "get_student_profile",
    "Get identity and class metadata for one or more students. Omit students to query all known students sequentially.",
    { ...studentsSchema, schoolYear: z.string().optional() },
    async (args) => serialize(async () => {
      log("info", "get_student_profile tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentProfile(
          await data.getStudentProfile({ ...t, schoolYear: args.schoolYear }),
        ),
      );
    }),
  );

  server.tool(
    "get_student_cahier_de_textes",
    "Get student homework grouped by day for one or more students. Omit students to query all known students sequentially.",
    { ...studentsSchema, date: z.string().optional() },
    async (args) => serialize(async () => {
      log("info", "get_student_cahier_de_textes tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentCahierDeTextes(
          await data.getStudentCahierDeTextes({ ...t, date: args.date }),
        ),
      );
    }),
  );

  server.tool(
    "get_student_cahier_de_textes_day",
    "Get detailed homework and lesson content for one or more students on a specific date. Omit students to query all known students sequentially.",
    { ...studentsSchema, date: z.string() },
    async (args) => serialize(async () => {
      log("info", "get_student_cahier_de_textes_day tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentCahierDeTextesDay(
          await data.getStudentCahierDeTextesDay({ ...t, date: args.date }),
        ),
      );
    }),
  );

  server.tool(
    "download_student_cahier_de_textes_attachment",
    "Download a selected homework or lesson attachment from a student's cahier de textes day detail",
    cahierDeTextesAttachmentQuerySchema,
    async (args) => serialize(async () => {
      log("info", "download_student_cahier_de_textes_attachment tool invoked");
      const result = await data.downloadStudentCahierDeTextesAttachment(args);
      return resultForStudentCahierDeTextesAttachment(result);
    }),
  );

  server.tool(
    "get_student_vie_scolaire",
    "Get student absences, dispenses, sanctions, and related vie scolaire settings for one or more students. Omit students to query all known students sequentially.",
    studentsSchema,
    async (args) => serialize(async () => {
      log("info", "get_student_vie_scolaire tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentVieScolaire(await data.getStudentVieScolaire(t)),
      );
    }),
  );

  server.tool(
    "list_student_carnet_correspondance",
    "List carnet de correspondance entries for one or more students. Omit students to query all known students sequentially.",
    studentsSchema,
    async (args) => serialize(async () => {
      log("info", "list_student_carnet_correspondance tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentCarnetCorrespondance(
          await data.listStudentCarnetCorrespondance(t),
        ),
      );
    }),
  );

  server.tool(
    "list_student_sessions_rdv",
    "List appointment sessions and invitee metadata for one or more students. Omit students to query all known students sequentially.",
    studentsSchema,
    async (args) => serialize(async () => {
      log("info", "list_student_sessions_rdv tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentSessionsRdv(
          await data.listStudentSessionsRdv(t),
        ),
      );
    }),
  );

  server.tool(
    "get_class_vie_de_la_classe",
    "Get class-level vie de la classe data for one or more students' classes. Omit students to query all known students sequentially.",
    studentsSchema,
    async (args) => serialize(async () => {
      log("info", "get_class_vie_de_la_classe tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForClassVieDeLaClasse(await data.getClassVieDeLaClasse(t)),
      );
    }),
  );

  server.tool(
    "get_student_emploi_du_temps",
    "Get student timetable events grouped by day for one or more students. Omit students to query all known students sequentially.",
    { ...studentsSchema, date: z.string().optional() },
    async (args) => serialize(async () => {
      log("info", "get_student_emploi_du_temps tool invoked");
      return forEachStudent(data, args.students, async (t) =>
        resultForStudentEmploiDuTemps(
          await data.getStudentEmploiDuTemps({ ...t, date: args.date }),
        ),
      );
    }),
  );

  // ── Teacher tools ──────────────────────────────────────────

  server.tool(
    "list_teacher_messages",
    "List messages for the teacher account. Requires a teacher (type P) profile.",
    teacherMessageFieldsSchema,
    async (args) => serialize(async () => {
      log("info", "list_teacher_messages tool invoked");
      const result = await data.listTeacherMessages(args);
      return resultForTeacherMessages(result);
    }),
  );

  server.tool(
    "get_teacher_emploi_du_temps",
    "Get teacher timetable for a date range. Requires a teacher (type P) profile.",
    teacherEmploiDuTempsQuerySchema,
    async (args) => serialize(async () => {
      log("info", "get_teacher_emploi_du_temps tool invoked");
      const result = await data.getTeacherEmploiDuTemps(args);
      return resultForTeacherEmploiDuTemps(result);
    }),
  );

  server.tool(
    "list_teacher_classes",
    "List classes assigned to the teacher from account metadata. No API call needed.",
    teacherQuerySchema,
    async (args) => serialize(async () => {
      log("info", "list_teacher_classes tool invoked");
      const result = await data.listTeacherClasses(args);
      return resultForTeacherClasses(result);
    }),
  );

  server.tool(
    "get_teacher_class_students",
    "Get the roster of students in a specific class. Use list_teacher_classes to find classId.",
    teacherClassStudentsQuerySchema,
    async (args) => serialize(async () => {
      log("info", "get_teacher_class_students tool invoked");
      const result = await data.getTeacherClassStudents(args);
      return resultForTeacherClassStudents(result);
    }),
  );

  server.tool(
    "list_teacher_rooms",
    "List available rooms for the teacher's establishment.",
    teacherQuerySchema,
    async (args) => serialize(async () => {
      log("info", "list_teacher_rooms tool invoked");
      const result = await data.listTeacherRooms(args);
      return resultForTeacherRooms(result);
    }),
  );

  server.tool(
    "get_teacher_note_settings",
    "Get grading configuration (composantes, types de devoirs, paramètres) for the teacher.",
    teacherQuerySchema,
    async (args) => serialize(async () => {
      log("info", "get_teacher_note_settings tool invoked");
      const result = await data.getTeacherNoteSettings(args);
      return resultForTeacherNoteSettings(result);
    }),
  );
}

function resultForFamilyDocuments(result: Awaited<ReturnType<EdDataService["getFamilyDocuments"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.totalDocuments} documents across ${countNonEmptyCategories(result.data)} categories for ${result.data.family.name}.`;
  return successResult(summary, result.data);
}

function resultForFamilyDocumentDownload(result: Awaited<ReturnType<EdDataService["downloadFamilyDocument"]>>) {
  if (!result.ok) return failureResult(result);
  const fileLabel = result.data.fileName ?? result.data.label ?? `document ${result.data.documentId}`;
  const summary = `Downloaded ${result.data.category} document "${fileLabel}" for ${result.data.family.name}.`;
  return successResult(summary, result.data);
}

function resultForFamilyInvoices(result: Awaited<ReturnType<EdDataService["listFamilyInvoices"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.invoices.length} invoices for ${result.data.family.name}.`;
  return successResult(summary, result.data);
}

function resultForFamilyMessages(result: Awaited<ReturnType<EdDataService["listFamilyMessages"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.messages.length} family messages for ${result.data.family.name} in ${result.data.mailbox}.`;
  return successResult(summary, result.data);
}

function resultForFamilyMessageDetail(
  result: Awaited<ReturnType<EdDataService["getFamilyMessageDetail"]>>,
) {
  if (!result.ok) return failureResult(result);
  const sender = result.data.from?.name ?? "unknown sender";
  const summary = `Loaded family message "${result.data.subject}" from ${sender} for ${result.data.family.name}.`;
  return successResult(summary, result.data);
}

function resultForStudentMessages(result: Awaited<ReturnType<EdDataService["listStudentMessages"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.messages.length} student messages for ${result.data.student.name} in ${result.data.mailbox}.`;
  return successResult(summary, result.data);
}

function resultForStudentNotes(result: Awaited<ReturnType<EdDataService["getStudentNotes"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.grades.length} grades across ${result.data.periods.length} periods for ${result.data.student.name}.`;
  return successResult(summary, result.data);
}

function resultForStudentProfile(result: Awaited<ReturnType<EdDataService["getStudentProfile"]>>) {
  if (!result.ok) return failureResult(result);
  const classLabel = result.data.classLabel ?? result.data.student.className ?? "unknown class";
  const summary = `Profile for ${result.data.fullName} in ${classLabel}.`;
  return successResult(summary, result.data);
}

function resultForStudentCahierDeTextes(
  result: Awaited<ReturnType<EdDataService["getStudentCahierDeTextes"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.totalAssignments} homework assignments across ${result.data.days.length} days for ${result.data.student.name}.`;
  return successResult(summary, result.data);
}

function resultForStudentCahierDeTextesDay(
  result: Awaited<ReturnType<EdDataService["getStudentCahierDeTextesDay"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.homeworkCount} homework entries and ${result.data.lessonContentCount} lesson content entries for ${result.data.student.name} on ${result.data.date}.`;
  return successResult(summary, result.data);
}

function resultForStudentCahierDeTextesAttachment(
  result: Awaited<ReturnType<EdDataService["downloadStudentCahierDeTextesAttachment"]>>,
) {
  if (!result.ok) return failureResult(result);
  const fileLabel = result.data.fileName ?? result.data.attachment.name ?? `attachment ${result.data.attachmentIndex}`;
  const summary = `Downloaded ${result.data.attachmentKind} ${fileLabel} for ${result.data.student.name} on ${result.data.date}.`;
  return successResult(summary, result.data);
}

function resultForStudentVieScolaire(
  result: Awaited<ReturnType<EdDataService["getStudentVieScolaire"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.absencesRetards.length} absences or retards, ${result.data.dispenses.length} dispenses, and ${result.data.sanctionsEncouragements.length} sanctions or encouragements for ${result.data.student.name}.`;
  return successResult(summary, result.data);
}

function resultForStudentCarnetCorrespondance(
  result: Awaited<ReturnType<EdDataService["listStudentCarnetCorrespondance"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.correspondences.length} carnet de correspondance entries for ${result.data.student.name}.`;
  return successResult(summary, result.data);
}

function resultForStudentSessionsRdv(
  result: Awaited<ReturnType<EdDataService["listStudentSessionsRdv"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.sessions.length} appointment sessions for ${result.data.student.name}.`;
  return successResult(summary, result.data);
}

function resultForClassVieDeLaClasse(
  result: Awaited<ReturnType<EdDataService["getClassVieDeLaClasse"]>>,
) {
  if (!result.ok) return failureResult(result);
  const classLabel = result.data.class.name ?? result.data.class.code ?? `class ${result.data.class.id}`;
  const summary = result.data.empty
    ? `No vie de la classe sections are available for ${classLabel}.`
    : `${result.data.sectionKeys.length} vie de la classe sections for ${classLabel}.`;
  return successResult(summary, result.data);
}

function resultForStudentEmploiDuTemps(
  result: Awaited<ReturnType<EdDataService["getStudentEmploiDuTemps"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.totalEvents} timetable events across ${result.data.days.length} days for ${result.data.student.name}.`;
  return successResult(summary, result.data);
}

// ── Teacher result formatters ──────────────────────────────────

function resultForTeacherMessages(
  result: Awaited<ReturnType<EdDataService["listTeacherMessages"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.messages.length} teacher messages for ${result.data.teacher.name} in ${result.data.mailbox}.`;
  return successResult(summary, result.data);
}

function resultForTeacherEmploiDuTemps(
  result: Awaited<ReturnType<EdDataService["getTeacherEmploiDuTemps"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.totalEvents} timetable events across ${result.data.days.length} days for ${result.data.teacher.name}.`;
  return successResult(summary, result.data);
}

function resultForTeacherClasses(
  result: Awaited<ReturnType<EdDataService["listTeacherClasses"]>>,
) {
  if (!result.ok) return failureResult(result);
  const count = result.data.classes?.length ?? 0;
  const summary = `${count} class(es) assigned to ${result.data.teacher.name}.`;
  return successResult(summary, result.data);
}

function resultForTeacherClassStudents(
  result: Awaited<ReturnType<EdDataService["getTeacherClassStudents"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.students.length} students in class for ${result.data.teacher.name}.`;
  return successResult(summary, result.data);
}

function resultForTeacherRooms(
  result: Awaited<ReturnType<EdDataService["listTeacherRooms"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.rooms.length} rooms available for ${result.data.teacher.name}.`;
  return successResult(summary, result.data);
}

function resultForTeacherNoteSettings(
  result: Awaited<ReturnType<EdDataService["getTeacherNoteSettings"]>>,
) {
  if (!result.ok) return failureResult(result);
  const summary = `Note settings loaded for ${result.data.teacher.name}: ${result.data.components.length} components, ${result.data.homeworkTypes.length} homework types.`;
  return successResult(summary, result.data);
}

function countNonEmptyCategories(data: FamilyDocumentsResult): number {
  let count = 0;
  if (data.factures.length > 0) count++;
  if (data.notes.length > 0) count++;
  if (data.viescolaire.length > 0) count++;
  if (data.administratifs.length > 0) count++;
  if (data.inscriptions.length > 0) count++;
  if (data.entreprises.length > 0) count++;
  return count;
}

function successResult(
  summary: string,
  payload:
    | ClassVieDeLaClasseResult
    | FamilyDocumentDownloadResult
    | FamilyDocumentsResult
    | FamilyInvoicesResult
    | FamilyMessageDetailResult
    | FamilyMessagesResult
    | StudentCahierDeTextesAttachmentResult
    | StudentCahierDeTextesResult
    | StudentCahierDeTextesDayResult
    | StudentCarnetCorrespondanceResult
    | StudentEmploiDuTempsResult
    | StudentMessagesResult
    | StudentNotesResult
    | StudentProfileResult
    | StudentSessionsRdvResult
    | StudentVieScolaireResult
    | TeacherClassStudentsResult
    | TeacherEmploiDuTempsResult
    | TeacherMessagesResult
    | TeacherNoteSettingsResult
    | TeacherRoomsResult
    | { scope: string; teacher: { name: string }; classes: unknown },
) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${summary}\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
    isError: false,
  };
}

function failureResult(result: DataFailure) {
  const details = { ...result };
  return {
    content: [
      {
        type: "text" as const,
        text: `${result.error}\n\n${JSON.stringify(details, null, 2)}`,
      },
    ],
    isError: true,
  };
}