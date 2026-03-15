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
import type { AccountInfo, StoredSession, TeacherClassInfo, TeacherGroupInfo, TeacherSubjectInfo } from "./types.js";

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
    const idLogin = typeof candidate.idLogin === "number" ? candidate.idLogin : undefined;
    const uid = typeof candidate.uid === "string" && candidate.uid ? candidate.uid : undefined;
    const isProfEtPersonnel = typeof candidate.isProfEtPersonnel === "boolean" ? candidate.isProfEtPersonnel : undefined;
    const main = typeof candidate.main === "boolean" ? candidate.main : undefined;
    const current = typeof candidate.current === "boolean" ? candidate.current : undefined;
    const students = normalizeStudents(candidate);
    const classes = normalizeImportClasses(candidate);
    const groups = normalizeImportGroups(candidate);
    const subjects = normalizeImportSubjects(candidate);
    const modules = normalizeImportModules(candidate);

    return [{
      id,
      type,
      name,
      ...(establishment ? { establishment } : {}),
      ...(idLogin !== undefined ? { idLogin } : {}),
      ...(uid ? { uid } : {}),
      ...(isProfEtPersonnel !== undefined ? { isProfEtPersonnel } : {}),
      ...(main !== undefined ? { main } : {}),
      ...(current !== undefined ? { current } : {}),
      ...(students ? { students } : {}),
      ...(classes ? { classes } : {}),
      ...(groups ? { groups } : {}),
      ...(subjects ? { subjects } : {}),
      ...(modules ? { modules } : {}),
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

// ── Teacher metadata import normalization ──────────────────────

function resolveProfile(candidate: Record<string, unknown>): Record<string, unknown> | undefined {
  return typeof candidate.profile === "object" && candidate.profile !== null
    ? candidate.profile as Record<string, unknown>
    : undefined;
}

function normalizeImportClasses(candidate: Record<string, unknown>): TeacherClassInfo[] | undefined {
  const profile = resolveProfile(candidate);
  const raw = Array.isArray(candidate.classes)
    ? candidate.classes
    : Array.isArray(profile?.classes)
      ? profile!.classes as unknown[]
      : [];
  if (raw.length === 0) return undefined;
  const result = raw.flatMap((entry) => {
    const c = entry as Record<string, unknown>;
    if (typeof c.id !== "number") return [];
    return [{
      id: c.id,
      ...(typeof c.code === "string" ? { code: c.code } : {}),
      ...(typeof c.label === "string" ? { label: c.label } : typeof c.libelle === "string" ? { label: c.libelle } : {}),
    }];
  });
  return result.length > 0 ? result : undefined;
}

function normalizeImportGroups(candidate: Record<string, unknown>): TeacherGroupInfo[] | undefined {
  const profile = resolveProfile(candidate);
  const raw = Array.isArray(candidate.groups)
    ? candidate.groups
    : Array.isArray(profile?.groupesNiveau)
      ? profile!.groupesNiveau as unknown[]
      : [];
  if (raw.length === 0) return undefined;
  const result = raw.flatMap((entry) => {
    const g = entry as Record<string, unknown>;
    if (typeof g.id !== "number") return [];
    return [{
      id: g.id,
      ...(typeof g.code === "string" ? { code: g.code } : {}),
      ...(typeof g.label === "string" ? { label: g.label } : typeof g.libelle === "string" ? { label: g.libelle } : {}),
      ...(typeof g.classId === "number" ? { classId: g.classId } : typeof g.idClasse === "number" ? { classId: g.idClasse } : {}),
      ...(typeof g.subjectCode === "string" ? { subjectCode: g.subjectCode } : typeof g.codeMatiere === "string" ? { subjectCode: g.codeMatiere } : {}),
    }];
  });
  return result.length > 0 ? result : undefined;
}

function normalizeImportSubjects(candidate: Record<string, unknown>): TeacherSubjectInfo[] | undefined {
  const profile = resolveProfile(candidate);
  const raw = Array.isArray(candidate.subjects)
    ? candidate.subjects
    : Array.isArray(profile?.matieres)
      ? profile!.matieres as unknown[]
      : [];
  if (raw.length === 0) return undefined;
  const result = raw.flatMap((entry) => {
    const m = entry as Record<string, unknown>;
    const code = typeof m.code === "string" ? m.code.trim() : "";
    if (!code) return [];
    return [{
      code,
      ...(typeof m.label === "string" ? { label: m.label } : typeof m.libelle === "string" ? { label: m.libelle } : {}),
    }];
  });
  return result.length > 0 ? result : undefined;
}

function normalizeImportModules(candidate: Record<string, unknown>): string[] | undefined {
  const raw = Array.isArray(candidate.modules) ? candidate.modules : [];
  if (raw.length === 0) return undefined;
  const result = raw.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    const m = entry as Record<string, unknown>;
    if (typeof m.code !== "string" || !m.code.trim()) return [];
    if (m.enable === false) return [];
    return [m.code.trim()];
  });
  return result.length > 0 ? result : undefined;
}
