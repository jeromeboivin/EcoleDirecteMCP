/**
 * Browser-export session import.
 *
 * Accepts a JSON file with a documented format and hydrates the auth state.
 *
 * Expected file format:
 * ```json
 * {
 *   "token": "<X-Token value>",
 *   "cookies": { "GTK": "...", ...otherCookies },
 *   "xGtk": "<X-GTK header value>",
 *   "version": "4.96.3"
 * }
 * ```
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AccountInfo, StoredSession } from "./types.js";

export interface SessionImportFile {
  token: string;
  cookies: Record<string, string>;
  xGtk?: string;
  twoFaToken?: string;
  accounts?: AccountInfo[];
  version?: string;
}

export async function parseSessionFile(filePath: string): Promise<StoredSession> {
  const abs = resolve(filePath);
  const raw = await readFile(abs, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Session file is not valid JSON: ${abs}`);
  }

  const file = parsed as SessionImportFile;
  if (!file.token || typeof file.token !== "string") {
    throw new Error("Session file missing required 'token' string field");
  }
  if (!file.cookies || typeof file.cookies !== "object") {
    throw new Error("Session file missing required 'cookies' object field");
  }

  return {
    token: file.token,
    cookies: file.cookies,
    xGtk: file.xGtk,
    twoFaToken: file.twoFaToken,
    accounts: normalizeAccounts(file.accounts),
    version: file.version ?? "4.96.3",
    savedAt: new Date().toISOString(),
  };
}

function normalizeAccounts(accounts: unknown): AccountInfo[] | undefined {
  if (!Array.isArray(accounts)) return undefined;
  const normalized = accounts.flatMap((account) => {
    const candidate = account as Record<string, unknown>;
    if (
      typeof candidate.id !== "number" ||
      typeof candidate.type !== "string" ||
      typeof candidate.name !== "string"
    ) {
      return [];
    }
    return [{
      id: candidate.id,
      type: candidate.type,
      name: candidate.name,
      establishment:
        typeof candidate.establishment === "string" ? candidate.establishment : undefined,
    }];
  });
  return normalized.length > 0 ? normalized : undefined;
}
