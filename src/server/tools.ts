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
    "Authenticate with EcoleDirecte using credentials stored in the configured credentials file. Optionally specify a named profile (e.g. 'parent', 'teacher') to isolate credentials.",
    { profile: z.string().optional() },
    async ({ profile }) => {
      log("info", "login tool invoked");
      if (profile) await auth.setActiveProfile(profile);
      const state = await auth.loginFromStore();
      return toolResult(state, auth.getActiveProfile());
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
      return toolResult(state, auth.getActiveProfile());
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
      return toolResult(state, auth.getActiveProfile());
    },
  );

  // ── import_session ───────────────────────────────────────────
  server.tool(
    "import_session",
    "Import an existing session from a browser-export JSON file. Optionally specify a named profile to store the session under.",
    { filePath: z.string(), profile: z.string().optional() },
    async ({ filePath, profile }) => {
      log("info", "import_session tool invoked");
      try {
        if (profile) await auth.setActiveProfile(profile);
        const session = await parseSessionFile(filePath);
        const state = await auth.importSession(session);
        return toolResult(state, auth.getActiveProfile());
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
  server.tool("auth_status", "Get the current authentication state and active profile", {}, async () => {
    const profiles = await auth.listProfiles();
    const profileInfo = profiles.profiles.length > 0
      ? `\nProfiles: ${profiles.profiles.join(", ")}${profiles.active ? ` (active: ${profiles.active})` : ""}`
      : "";
    const result = toolResult(auth.getState(), auth.getActiveProfile());
    result.content[0].text += profileInfo;
    return result;
  });

  // ── logout ───────────────────────────────────────────────────
  server.tool(
    "logout",
    "Clear the current session (keeps saved credentials). Optionally specify a profile.",
    { profile: z.string().optional() },
    async ({ profile }) => {
      log("info", "logout tool invoked");
      if (profile) await auth.setActiveProfile(profile);
      const state = await auth.logout();
      return toolResult(state, auth.getActiveProfile());
    },
  );

  // ── logout_full ──────────────────────────────────────────────
  server.tool(
    "logout_full",
    "Clear both the current session and saved credentials. Optionally specify a profile.",
    { profile: z.string().optional() },
    async ({ profile }) => {
      log("info", "logout_full tool invoked");
      if (profile) await auth.setActiveProfile(profile);
      const state = await auth.logoutFull();
      return toolResult(state, auth.getActiveProfile());
    },
  );

  // ── validate_session ────────────────────────────────────────
  server.tool(
    "validate_session",
    "Validate the current session against the live API. Optionally specify a profile.",
    { profile: z.string().optional() },
    async ({ profile }) => {
      log("info", "validate_session tool invoked");
      if (profile) await auth.setActiveProfile(profile);
      const state = await auth.validateSession();
      return toolResult(state, auth.getActiveProfile());
    },
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function toolResult(state: ReturnType<AuthService["getState"]>, profile?: string) {
  const prefix = profile ? `[profile: ${profile}] ` : "";
  const text = prefix + formatState(state);
  const isError = state.status === "error";
  return { content: [{ type: "text" as const, text }], isError };
}

function formatState(state: ReturnType<AuthService["getState"]>): string {
  switch (state.status) {
    case "logged-out":
      return "Not authenticated. Use the login tool or import a session.";
    case "login-pending":
      return "Login is already in progress — please wait and retry.";
    case "totp-required":
      return `Two-factor authentication required (TOTP: ${state.totp}). Use submit_totp with your code.`;
    case "doubleauth-required":
      return `${state.question} Choices: ${state.choices
        .map((choice, index) => `${index + 1}. ${choice.label}`)
        .join(", ")}. Use submit_doubleauth with your choiceIndex.`;
    case "authenticated":
      return `Authenticated${formatCurrentAccount(state.accounts)}. Accounts: ${formatAccountList(state.accounts)}`;
    case "session-imported":
      return `Session imported successfully. Token loaded${formatCurrentAccount(state.accounts ?? [])}.`;
    case "error":
      return `Error: ${state.message}${state.recoverable ? " (recoverable — you can retry)" : ""}`;
  }
}

function formatCurrentAccount(accounts: { name: string; establishment?: string; current?: boolean }[]): string {
  const current = accounts.find((account) => account.current === true);
  if (!current) return "";
  const label = current.establishment ? `${current.name} / ${current.establishment}` : current.name;
  return ` (current account: ${label})`;
}

function formatAccountList(
  accounts: { name: string; type: string; establishment?: string; current?: boolean; students?: { name: string; className?: string; establishment?: string }[]; classes?: { id: number }[]; modules?: string[] }[],
): string {
  if (accounts.length === 0) return "none parsed";
  return accounts
    .map((account) => {
      let label = `${account.name} (${account.type})`;
      if (account.establishment) label += ` @ ${account.establishment}`;
      if (account.current) label += " [current]";
      if (account.students && account.students.length > 0) {
        const studentLabels = account.students.map((s) => {
          let sl = s.name;
          if (s.className) sl += ` (${s.className})`;
          return sl;
        });
        label += ` — students: ${studentLabels.join(", ")}`;
      }
      if (account.classes && account.classes.length > 0) {
        label += ` — ${account.classes.length} class(es)`;
      }
      if (account.modules && account.modules.length > 0) {
        label += ` — modules: ${account.modules.join(", ")}`;
      }
      return label;
    })
    .join(" | ");
}
