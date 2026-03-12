import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  ClassVieDeLaClasseResult,
  DataFailure,
  EdDataService,
  FamilyMessagesResult,
  StudentCahierDeTextesResult,
  StudentCahierDeTextesDayResult,
  StudentCarnetCorrespondanceResult,
  StudentEmploiDuTempsResult,
  StudentMessagesResult,
  StudentNotesResult,
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

const studentQuerySchema = {
  accountId: z.number().int().positive().optional(),
  studentId: z.number().int().positive().optional(),
};

export function registerDataTools(server: McpServer, data: EdDataService): void {
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

function resultForFamilyMessages(result: Awaited<ReturnType<EdDataService["listFamilyMessages"]>>) {
  if (!result.ok) return failureResult(result);
  const summary = `${result.data.messages.length} family messages for ${result.data.family.name} in ${result.data.mailbox}.`;
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

function successResult(
  summary: string,
  payload:
    | ClassVieDeLaClasseResult
    | FamilyMessagesResult
    | StudentCahierDeTextesResult
    | StudentCahierDeTextesDayResult
    | StudentCarnetCorrespondanceResult
    | StudentEmploiDuTempsResult
    | StudentMessagesResult
    | StudentNotesResult
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