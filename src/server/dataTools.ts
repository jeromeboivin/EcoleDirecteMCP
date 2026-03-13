import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  ClassVieDeLaClasseResult,
  DataFailure,
  EdDataService,
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
} from "../ecoledirecte/data/service.js";
import { log } from "../ecoledirecte/logging.js";

const messageQuerySchema = {
  accountId: z.number().int().positive().optional(),
  mailbox: z.enum(["received", "sent", "archived", "draft"]).optional(),
  folderId: z.number().int().min(0).optional(),
  query: z.string().optional(),
  page: z.number().int().min(0).optional(),
  itemsPerPage: z.number().int().min(1).max(100).optional(),
};

const familyMessageDetailQuerySchema = {
  accountId: z.number().int().positive().optional(),
  messageId: z.number().int().positive(),
  messagesYear: z.string().optional(),
};

const studentQuerySchema = {
  accountId: z.number().int().positive().optional(),
  studentId: z.number().int().positive().optional(),
};

const cahierDeTextesAttachmentQuerySchema = {
  ...studentQuerySchema,
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

export function registerDataTools(server: McpServer, data: EdDataService): void {
  server.tool(
    "get_family_documents",
    "Get family-level documents grouped by category (factures, notes, vie scolaire, administratifs, inscriptions, entreprises)",
    { accountId: z.number().int().positive().optional() },
    async (args) => {
      log("info", "get_family_documents tool invoked");
      const result = await data.getFamilyDocuments(args);
      return resultForFamilyDocuments(result);
    },
  );

  server.tool(
    "list_family_invoices",
    "List family-level invoices and signature documents",
    { accountId: z.number().int().positive().optional() },
    async (args) => {
      log("info", "list_family_invoices tool invoked");
      const result = await data.listFamilyInvoices(args);
      return resultForFamilyInvoices(result);
    },
  );

  server.tool(
    "list_family_messages",
    "List family-level messages for the authenticated EcoleDirecte family account",
    messageQuerySchema,
    async (args) => {
      log("info", "list_family_messages tool invoked");
      const result = await data.listFamilyMessages(args);
      return resultForFamilyMessages(result);
    },
  );

  server.tool(
    "get_family_message_detail",
    "Get the full content of a selected family message. This mirrors opening the message in EcoleDirecte and may mark it as read.",
    familyMessageDetailQuerySchema,
    async (args) => {
      log("info", "get_family_message_detail tool invoked");
      const result = await data.getFamilyMessageDetail(args);
      return resultForFamilyMessageDetail(result);
    },
  );

  server.tool(
    "list_student_messages",
    "List student-level messages for an authenticated student account",
    {
      ...messageQuerySchema,
      studentId: z.number().int().positive().optional(),
    },
    async (args) => {
      log("info", "list_student_messages tool invoked");
      const result = await data.listStudentMessages(args);
      return resultForStudentMessages(result);
    },
  );

  server.tool(
    "get_student_notes",
    "Get student notes and period averages for an authenticated student account",
    {
      ...studentQuerySchema,
      periodCode: z.string().optional(),
    },
    async (args) => {
      log("info", "get_student_notes tool invoked");
      const result = await data.getStudentNotes(args);
      return resultForStudentNotes(result);
    },
  );

  server.tool(
    "get_student_profile",
    "Get identity and class metadata for an authenticated student account",
    {
      ...studentQuerySchema,
      schoolYear: z.string().optional(),
    },
    async (args) => {
      log("info", "get_student_profile tool invoked");
      const result = await data.getStudentProfile(args);
      return resultForStudentProfile(result);
    },
  );

  server.tool(
    "get_student_cahier_de_textes",
    "Get student homework grouped by day for an authenticated student account",
    {
      ...studentQuerySchema,
      date: z.string().optional(),
    },
    async (args) => {
      log("info", "get_student_cahier_de_textes tool invoked");
      const result = await data.getStudentCahierDeTextes(args);
      return resultForStudentCahierDeTextes(result);
    },
  );

  server.tool(
    "get_student_cahier_de_textes_day",
    "Get detailed homework and lesson content for a selected student on a specific date",
    {
      ...studentQuerySchema,
      date: z.string(),
    },
    async (args) => {
      log("info", "get_student_cahier_de_textes_day tool invoked");
      const result = await data.getStudentCahierDeTextesDay(args);
      return resultForStudentCahierDeTextesDay(result);
    },
  );

  server.tool(
    "download_student_cahier_de_textes_attachment",
    "Download a selected homework or lesson attachment from a student's cahier de textes day detail",
    cahierDeTextesAttachmentQuerySchema,
    async (args) => {
      log("info", "download_student_cahier_de_textes_attachment tool invoked");
      const result = await data.downloadStudentCahierDeTextesAttachment(args);
      return resultForStudentCahierDeTextesAttachment(result);
    },
  );

  server.tool(
    "get_student_vie_scolaire",
    "Get student absences, dispenses, sanctions, and related vie scolaire settings",
    studentQuerySchema,
    async (args) => {
      log("info", "get_student_vie_scolaire tool invoked");
      const result = await data.getStudentVieScolaire(args);
      return resultForStudentVieScolaire(result);
    },
  );

  server.tool(
    "list_student_carnet_correspondance",
    "List carnet de correspondance entries for an authenticated student account",
    studentQuerySchema,
    async (args) => {
      log("info", "list_student_carnet_correspondance tool invoked");
      const result = await data.listStudentCarnetCorrespondance(args);
      return resultForStudentCarnetCorrespondance(result);
    },
  );

  server.tool(
    "list_student_sessions_rdv",
    "List appointment sessions and invitee metadata for an authenticated student account",
    studentQuerySchema,
    async (args) => {
      log("info", "list_student_sessions_rdv tool invoked");
      const result = await data.listStudentSessionsRdv(args);
      return resultForStudentSessionsRdv(result);
    },
  );

  server.tool(
    "get_class_vie_de_la_classe",
    "Get class-level vie de la classe data for the selected student's class",
    studentQuerySchema,
    async (args) => {
      log("info", "get_class_vie_de_la_classe tool invoked");
      const result = await data.getClassVieDeLaClasse(args);
      return resultForClassVieDeLaClasse(result);
    },
  );

  server.tool(
    "get_student_emploi_du_temps",
    "Get student timetable events grouped by day for an authenticated student account",
    {
      ...studentQuerySchema,
      date: z.string().optional(),
    },
    async (args) => {
      log("info", "get_student_emploi_du_temps tool invoked");
      const result = await data.getStudentEmploiDuTemps(args);
      return resultForStudentEmploiDuTemps(result);
    },
  );
}

function resultForFamilyDocuments(result: Awaited<ReturnType<EdDataService["getFamilyDocuments"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.totalDocuments} documents across ${countNonEmptyCategories(result.data)} categories for ${result.data.family.name}.`;
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
    | StudentVieScolaireResult,
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