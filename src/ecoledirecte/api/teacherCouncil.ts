import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherCouncilTextEntry {
  id?: string;
  code?: string;
  label?: string;
  date?: string;
  text?: string;
}

export interface TeacherCouncilMentionOption {
  id: number;
  label?: string;
  lineNumber?: number;
}

export interface TeacherCouncilAppreciationSetting {
  code?: string;
  id?: number;
  label?: string;
  maxCharacters?: number;
}

export interface TeacherCouncilSettings {
  principalProfessorCanEditSchoolLife: boolean;
  principalProfessorCanEditAll: boolean;
  classAppreciationEditable: boolean;
  principalProfessorMaxCharacters?: number;
  mentionOptions: TeacherCouncilMentionOption[];
  appreciationSettings: TeacherCouncilAppreciationSetting[];
}

export interface TeacherCouncilStudent {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  arrivalOrder?: string;
  gender?: string;
  dispositifs: unknown[];
  appreciationPP?: TeacherCouncilTextEntry;
  appreciationCE?: TeacherCouncilTextEntry;
  appreciationVS?: TeacherCouncilTextEntry;
  appreciationCN?: TeacherCouncilTextEntry;
  mentionDuConseil?: TeacherCouncilTextEntry;
}

export interface TeacherCouncilPayload {
  students: TeacherCouncilStudent[];
  studentCount: number;
  settings: TeacherCouncilSettings;
  generalAppreciation?: TeacherCouncilTextEntry;
}

export interface NormalizedTeacherCouncilResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherCouncilPayload;
  message?: string;
}

export function normalizeTeacherCouncilResponse(
  raw: RawApiResponse,
): NormalizedTeacherCouncilResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = raw.data as Record<string, unknown> | undefined;
  const students = normalizeStudents(data?.eleves);
  const settings = normalizeSettings(data?.parametrage);
  const generalAppreciation = normalizeTextEntry(data?.appreciationGenerale);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      students,
      studentCount: students.length,
      settings,
      ...(generalAppreciation ? { generalAppreciation } : {}),
    },
  };
}

function normalizeStudents(value: unknown): TeacherCouncilStudent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const student = entry as Record<string, unknown>;
    if (typeof student.id !== "number") return [];

    const firstName = typeof student.prenom === "string" ? student.prenom.trim() : "";
    const lastName = typeof student.nom === "string" ? student.nom.trim() : "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || `student ${student.id}`;

    return [{
      id: student.id,
      name,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(typeof student.photo === "string" && student.photo ? { photo: student.photo } : {}),
      ...(typeof student.ordreArrivee === "string" && student.ordreArrivee ? { arrivalOrder: student.ordreArrivee } : {}),
      ...(typeof student.sexe === "string" && student.sexe ? { gender: student.sexe } : {}),
      dispositifs: Array.isArray(student.dispositifs) ? student.dispositifs : [],
      ...(normalizeTextEntry(student.appreciationPP) ? { appreciationPP: normalizeTextEntry(student.appreciationPP)! } : {}),
      ...(normalizeTextEntry(student.appreciationCE) ? { appreciationCE: normalizeTextEntry(student.appreciationCE)! } : {}),
      ...(normalizeTextEntry(student.appreciationVS) ? { appreciationVS: normalizeTextEntry(student.appreciationVS)! } : {}),
      ...(normalizeTextEntry(student.appreciationCN) ? { appreciationCN: normalizeTextEntry(student.appreciationCN)! } : {}),
      ...(normalizeTextEntry(student.mentionDuConseil) ? { mentionDuConseil: normalizeTextEntry(student.mentionDuConseil)! } : {}),
    }];
  });
}

function normalizeSettings(value: unknown): TeacherCouncilSettings {
  const settings = value as Record<string, unknown> | undefined;

  return {
    principalProfessorCanEditSchoolLife: settings?.PPModifVS === true,
    principalProfessorCanEditAll: settings?.PPModifTout === true,
    classAppreciationEditable: settings?.saisieAppreciationClasse === true,
    ...(typeof settings?.longueurMaxAppPP === "number"
      ? { principalProfessorMaxCharacters: settings.longueurMaxAppPP }
      : {}),
    mentionOptions: normalizeMentionOptions(settings?.mentions),
    appreciationSettings: normalizeAppreciationSettings(settings?.appreciations),
  };
}

function normalizeMentionOptions(value: unknown): TeacherCouncilMentionOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const mention = entry as Record<string, unknown>;
    if (typeof mention.id !== "number") return [];
    return [{
      id: mention.id,
      ...(typeof mention.libelle === "string" && mention.libelle ? { label: mention.libelle } : {}),
      ...(typeof mention.numLigne === "number" ? { lineNumber: mention.numLigne } : {}),
    }];
  });
}

function normalizeAppreciationSettings(value: unknown): TeacherCouncilAppreciationSetting[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const appreciation = entry as Record<string, unknown>;
    if (typeof appreciation.code !== "string" && typeof appreciation.id !== "number") return [];
    return [{
      ...(typeof appreciation.code === "string" && appreciation.code ? { code: appreciation.code } : {}),
      ...(typeof appreciation.id === "number" ? { id: appreciation.id } : {}),
      ...(typeof appreciation.libelle === "string" && appreciation.libelle ? { label: appreciation.libelle } : {}),
      ...(typeof appreciation.nbCaracteres === "number" ? { maxCharacters: appreciation.nbCaracteres } : {}),
    }];
  });
}

function normalizeTextEntry(value: unknown): TeacherCouncilTextEntry | undefined {
  const entry = value as Record<string, unknown> | undefined;
  if (!entry || typeof entry !== "object") return undefined;

  const normalized: TeacherCouncilTextEntry = {
    ...(typeof entry.id === "string" && entry.id ? { id: entry.id } : {}),
    ...(typeof entry.code === "string" && entry.code ? { code: entry.code } : {}),
    ...(typeof entry.libelle === "string" && entry.libelle ? { label: entry.libelle } : {}),
    ...(typeof entry.date === "string" && entry.date ? { date: entry.date } : {}),
    ...(decodeBase64OrPlainText(entry.text) ? { text: decodeBase64OrPlainText(entry.text) } : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function decodeBase64OrPlainText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/[^A-Za-z0-9+/=\s]/.test(trimmed)) return trimmed;

  try {
    const decoded = Buffer.from(trimmed.replace(/\s+/g, ""), "base64").toString("utf-8").trim();
    return decoded || trimmed;
  } catch {
    return trimmed;
  }
}