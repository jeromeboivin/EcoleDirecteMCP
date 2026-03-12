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
import type { StoredSession } from "./types.js";

export interface SessionImportFile {
  token: string;
  cookies: Record<string, string>;
  xGtk?: string;
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
    version: file.version ?? "4.96.3",
    savedAt: new Date().toISOString(),
  };
}
