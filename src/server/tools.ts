/**
 * MCP tool definitions and handlers for auth-focused operations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthService } from "../ecoledirecte/auth/service.js";
import { parseSessionFile } from "../ecoledirecte/auth/sessionImport.js";
import { log } from "../ecoledirecte/logging.js";

export function registerTools(server: McpServer, auth: AuthService): void {
  // ── login ────────────────────────────────────────────────────
  server.tool(
    "login",
    "Authenticate with EcoleDirecte using username and password",
    { identifiant: z.string(), motdepasse: z.string() },
    async ({ identifiant, motdepasse }) => {
      log("info", "login tool invoked");
      const state = await auth.login(identifiant, motdepasse);
      return toolResult(state);
    },
  );

  // ── submit_totp ──────────────────────────────────────────────
  server.tool(
    "submit_totp",
    "Submit a TOTP code to complete two-factor authentication",
    { code: z.string() },
    async ({ code }) => {
      log("info", "submit_totp tool invoked");
      const state = await auth.submitTotp(code);
      return toolResult(state);
    },
  );

  // ── submit_doubleauth ───────────────────────────────────────
  server.tool(
    "submit_doubleauth",
    "Submit the choice index for the identity-verification question shown after login",
    { choiceIndex: z.number().int().positive() },
    async ({ choiceIndex }) => {
      log("info", "submit_doubleauth tool invoked");
      const state = await auth.submitDoubleAuthChoice(choiceIndex);
      return toolResult(state);
    },
  );

  // ── import_session ───────────────────────────────────────────
  server.tool(
    "import_session",
    "Import an existing session from a browser-export JSON file",
    { filePath: z.string() },
    async ({ filePath }) => {
      log("info", "import_session tool invoked");
      try {
        const session = await parseSessionFile(filePath);
        const state = await auth.importSession(session);
        return toolResult(state);
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── auth_status ──────────────────────────────────────────────
  server.tool("auth_status", "Get the current authentication state", {}, async () => {
    return toolResult(auth.getState());
  });

  // ── logout ───────────────────────────────────────────────────
  server.tool(
    "logout",
    "Clear the current session (keeps saved credentials)",
    {},
    async () => {
      log("info", "logout tool invoked");
      const state = await auth.logout();
      return toolResult(state);
    },
  );

  // ── logout_full ──────────────────────────────────────────────
  server.tool(
    "logout_full",
    "Clear both the current session and saved credentials",
    {},
    async () => {
      log("info", "logout_full tool invoked");
      const state = await auth.logoutFull();
      return toolResult(state);
    },
  );

  // ── validate_session ────────────────────────────────────────
  server.tool(
    "validate_session",
    "Validate the current session against the live API. Promotes an imported or restored session to authenticated, or clears it and falls back to saved credentials if stale.",
    {},
    async () => {
      log("info", "validate_session tool invoked");
      const state = await auth.validateSession();
      return toolResult(state);
    },
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function toolResult(state: ReturnType<AuthService["getState"]>) {
  const text = formatState(state);
  const isError = state.status === "error";
  return { content: [{ type: "text" as const, text }], isError };
}

function formatState(state: ReturnType<AuthService["getState"]>): string {
  switch (state.status) {
    case "logged-out":
      return "Not authenticated. Use the login tool or import a session.";
    case "login-pending":
      return "Login in progress…";
    case "totp-required":
      return `Two-factor authentication required (TOTP: ${state.totp}). Use submit_totp with your code.`;
    case "doubleauth-required":
      return `${state.question} Choices: ${state.choices
        .map((choice, index) => `${index + 1}. ${choice.label}`)
        .join(", ")}. Use submit_doubleauth with your choiceIndex.`;
    case "authenticated":
      return `Authenticated. Accounts: ${state.accounts.map((a) => `${a.name} (${a.type})`).join(", ") || "none parsed"}`;
    case "session-imported":
      return "Session imported successfully. Token loaded.";
    case "error":
      return `Error: ${state.message}${state.recoverable ? " (recoverable — you can retry)" : ""}`;
  }
}
