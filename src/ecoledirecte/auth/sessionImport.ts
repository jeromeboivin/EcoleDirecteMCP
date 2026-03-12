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
    const id = typeof candidate.id === "number" ? candidate.id : undefined;
    const type =
      typeof candidate.type === "string"
        ? candidate.type
        : typeof candidate.typeCompte === "string"
          ? candidate.typeCompte
          : undefined;
    const name = resolveAccountName(candidate);

    if (id === undefined || type === undefined || name === undefined) {
      return [];
    }

    const establishment =
      typeof candidate.establishment === "string"
        ? candidate.establishment
        : typeof candidate.nomEtablissement === "string"
          ? candidate.nomEtablissement
          : undefined;
    const main = typeof candidate.main === "boolean" ? candidate.main : undefined;
    const students = normalizeStudents(candidate);

    return [{
      id,
      type,
      name,
      ...(establishment ? { establishment } : {}),
      ...(main !== undefined ? { main } : {}),
      ...(students ? { students } : {}),
    }];
  });
  return normalized.length > 0 ? normalized : undefined;
}

function resolveAccountName(candidate: Record<string, unknown>): string | undefined {
  if (typeof candidate.name === "string" && candidate.name.trim().length > 0) {
    return candidate.name.trim();
  }

  const firstName = typeof candidate.prenom === "string" ? candidate.prenom.trim() : "";
  const lastName = typeof candidate.nom === "string" ? candidate.nom.trim() : "";
  const combined = `${firstName} ${lastName}`.trim();
  return combined.length > 0 ? combined : undefined;
}

function normalizeStudents(candidate: Record<string, unknown>): AccountInfo["students"] {
  const students = Array.isArray(candidate.students)
    ? candidate.students
    : Array.isArray((candidate.profile as Record<string, unknown> | undefined)?.eleves)
      ? ((candidate.profile as Record<string, unknown>).eleves as unknown[])
      : [];

  const normalized = students.flatMap((student) => {
    const value = student as Record<string, unknown>;
    if (typeof value.id !== "number") return [];

    const firstName = typeof value.prenom === "string" ? value.prenom.trim() : "";
    const lastName = typeof value.nom === "string" ? value.nom.trim() : "";
    const explicitName = typeof value.name === "string" ? value.name.trim() : "";
    const name = explicitName || `${firstName} ${lastName}`.trim();
    if (!name) return [];

    const classe = value.classe as Record<string, unknown> | undefined;
    const classId = typeof value.classId === "number"
      ? value.classId
      : typeof classe?.id === "number"
        ? classe.id
        : undefined;
    const className = typeof value.className === "string"
      ? value.className
      : typeof classe?.libelle === "string"
        ? classe.libelle
        : undefined;
    const classCode = typeof value.classCode === "string"
      ? value.classCode
      : typeof classe?.code === "string"
        ? classe.code
        : undefined;
    const establishment = typeof value.establishment === "string"
      ? value.establishment
      : typeof value.nomEtablissement === "string"
        ? value.nomEtablissement
        : undefined;

    return [{
      id: value.id,
      name,
      ...(classId !== undefined ? { classId } : {}),
      ...(className ? { className } : {}),
      ...(classCode ? { classCode } : {}),
      ...(establishment ? { establishment } : {}),
    }];
  });

  return normalized.length > 0 ? normalized : undefined;
}
