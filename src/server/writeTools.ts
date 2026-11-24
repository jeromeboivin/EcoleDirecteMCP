import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeOperationSchema } from "../ecoledirecte/api/writes.js";
import { WriteOutcomeUnknown, type EdWriteService } from "../ecoledirecte/write/service.js";
import { serialize } from "./serialize.js";

export function registerWriteTools(server: McpServer, writes: EdWriteService): void {
  server.registerTool("list_ecoledirecte_write_capabilities", {
    description: "List the supported operation kinds and action names without authenticating or contacting ÉcoleDirecte. Use prepare_ecoledirecte_write for the full input schema.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, () => result(async () => writeOperationSchema.options.map(({ shape }) => {
    const change = "change" in shape ? shape.change : undefined;
    const delivery = "delivery" in shape ? shape.delivery.unwrap() : undefined;
    const actions = change?.options.flatMap(({ shape }) => choiceValues(shape.action));
    const modes = delivery?.options.flatMap(({ shape }) => choiceValues(shape.mode));
    return { kind: shape.kind.value, ...(actions ? { actions } : {}), ...(modes ? { modes } : {}) };
  })));

  server.registerTool("prepare_ecoledirecte_write", {
    description: "Preview a typed ÉcoleDirecte write (messaging, cahier, gradebook, attendance, quizzes, forms, workspaces or Cloud). Makes no network requests. Show all changes and their effects to the user and obtain explicit approval before executing. A newer preview replaces the previous one.",
    inputSchema: { operation: writeOperationSchema },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, ({ operation }) => serialize(() => result(() => writes.prepare(operation))));

  server.registerTool("execute_ecoledirecte_write", {
    description: "Apply the exact preview once to the live ÉcoleDirecte account. Only use after the user explicitly approves that preview; never retry an uncertain write. Requires ECOLEDIRECTE_ENABLE_WRITES=1 and the same session used to prepare it.",
    inputSchema: { planId: z.string().uuid(), confirm: z.literal(true) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, ({ planId, confirm }, { signal }) => serialize(() => result(() => writes.execute(planId, confirm, signal))));
}

function choiceValues(option: z.ZodTypeAny): string[] {
  return option instanceof z.ZodLiteral && typeof option.value === "string" ? [option.value]
    : option instanceof z.ZodEnum ? option.options as string[] : [];
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
