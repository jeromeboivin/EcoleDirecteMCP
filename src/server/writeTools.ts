import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeOperationSchema } from "../ecoledirecte/api/writes.js";
import { WriteOutcomeUnknown, type EdWriteService } from "../ecoledirecte/write/service.js";
import { serialize } from "./serialize.js";

export function registerWriteTools(server: McpServer, writes: EdWriteService): void {
  server.registerTool("prepare_ecoledirecte_write", {
    description: "Preview a staff message, new teacher homework or lesson content, or a document attachment to an existing cahier entry. Makes no network requests. Show the preview to the user and obtain explicit approval before executing it. A newer preview replaces the previous one.",
    inputSchema: { operation: writeOperationSchema },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ operation }) => serialize(() => result(() => writes.prepare(operation))));

  server.registerTool("execute_ecoledirecte_write", {
    description: "Apply the exact preview once to the live ÉcoleDirecte account. Only use after the user explicitly approves that preview; never retry an uncertain write. Requires ECOLEDIRECTE_ENABLE_WRITES=1 and the same session used to prepare it.",
    inputSchema: { planId: z.string().uuid(), confirm: z.literal(true) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, ({ planId, confirm }, { signal }) => serialize(() => result(() => writes.execute(planId, confirm, signal))));
}

async function result(action: () => Promise<unknown>) {
  try {
    const data = await action();
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], isError: false };
  } catch (error) {
    const data = {
      status: error instanceof WriteOutcomeUnknown ? "outcome_unknown" : "error",
      error: error instanceof Error ? error.message : "Unexpected write error.",
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], isError: true };
  }
}
