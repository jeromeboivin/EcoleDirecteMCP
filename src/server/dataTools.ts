import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  DataFailure,
  EdDataService,
  FamilyMessagesResult,
  StudentMessagesResult,
  StudentNotesResult,
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
      accountId: z.number().int().positive().optional(),
      studentId: z.number().int().positive().optional(),
      periodCode: z.string().optional(),
    },
    async (args) => {
      log("info", "get_student_notes tool invoked");
      const result = await data.getStudentNotes(args);
      return resultForStudentNotes(result);
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

function successResult(
  summary: string,
  payload: FamilyMessagesResult | StudentMessagesResult | StudentNotesResult,
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