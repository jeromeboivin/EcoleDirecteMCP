import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherPredefinedAppreciation {
  id: number;
  code?: string;
  label?: string;
  type?: string;
  authorId?: number;
}

export interface TeacherGradebookAppreciationEntry {
  code: string;
  label?: string;
  content?: string;
}

export interface TeacherGradebookAppreciationPeriod {
  code: string;
  label?: string;
  shortLabel?: string;
  average?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  open: boolean;
  averageCalculatedAt?: string;
  appreciations: TeacherGradebookAppreciationEntry[];
  positionsBySubSubject: unknown[];
  programElements: unknown[];
}

export interface TeacherGradebookAppreciationStudent {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  classCode?: string;
  gender?: string;
  photo?: string;
  arrivalOrder?: string;
  dispositifs: unknown[];
  periods: TeacherGradebookAppreciationPeriod[];
}

export interface TeacherGradebookAppreciationsPayload {
  students: TeacherGradebookAppreciationStudent[];
  studentCount: number;
}

export interface TeacherGradebookPredefinedAppreciationsPayload {
  predefinedAppreciations: TeacherPredefinedAppreciation[];
  maxCharacters?: number;
}

export interface NormalizedTeacherGradebookAppreciationsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherGradebookAppreciationsPayload;
  message?: string;
}

export interface NormalizedTeacherGradebookPredefinedAppreciationsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherGradebookPredefinedAppreciationsPayload;
  message?: string;
}

export function normalizeTeacherGradebookAppreciationsResponse(
  raw: RawApiResponse,
): NormalizedTeacherGradebookAppreciationsResponse {
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

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      students,
      studentCount: students.length,
    },
  };
}

export function normalizeTeacherGradebookPredefinedAppreciationsResponse(
  raw: RawApiResponse,
): NormalizedTeacherGradebookPredefinedAppreciationsResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = raw.data as Record<string, unknown> | undefined;
  const predefinedAppreciations = normalizePredefinedAppreciations(data?.appreciations);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      predefinedAppreciations,
      ...(typeof (data?.parametrage as Record<string, unknown> | undefined)?.nbCaractMax === "number"
        ? { maxCharacters: (data?.parametrage as Record<string, unknown>).nbCaractMax as number }
        : {}),
    },
  };
}

function normalizePredefinedAppreciations(value: unknown): TeacherPredefinedAppreciation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const appreciation = entry as Record<string, unknown>;
    if (typeof appreciation.id !== "number") return [];
    return [{
      id: appreciation.id,
      ...(typeof appreciation.code === "string" ? { code: appreciation.code } : {}),
      ...(decodeBase64Text(appreciation.libelle) ? { label: decodeBase64Text(appreciation.libelle) } : {}),
      ...(typeof appreciation.type === "string" ? { type: appreciation.type } : {}),
      ...(typeof appreciation.idAuteur === "number" ? { authorId: appreciation.idAuteur } : {}),
    }];
  });
}

function normalizeStudents(value: unknown): TeacherGradebookAppreciationStudent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const studentEntry = entry as Record<string, unknown>;
    const student = studentEntry.eleve as Record<string, unknown> | undefined;
    if (!student || typeof student.id !== "number") return [];

    const firstName = typeof student.prenom === "string" ? student.prenom.trim() : "";
    const lastName = typeof student.nom === "string" ? student.nom.trim() : "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || `student ${student.id}`;

    return [{
      id: student.id,
      name,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(typeof student.codeClasse === "string" ? { classCode: student.codeClasse } : {}),
      ...(typeof student.sexe === "string" ? { gender: student.sexe } : {}),
      ...(typeof student.photo === "string" ? { photo: student.photo } : {}),
      ...(typeof student.ordreArrivee === "string" ? { arrivalOrder: student.ordreArrivee } : {}),
      dispositifs: Array.isArray(student.dispositifs) ? student.dispositifs : [],
      periods: normalizePeriods(studentEntry.periodes),
    }];
  });
}

function normalizePeriods(value: unknown): TeacherGradebookAppreciationPeriod[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const period = entry as Record<string, unknown>;
    if (typeof period.code !== "string") return [];
    return [{
      code: period.code,
      ...(typeof period.libelle === "string" ? { label: period.libelle } : {}),
      ...(typeof period.libelleCourt === "string" ? { shortLabel: period.libelleCourt } : {}),
      ...(typeof period.moyenne === "string" && period.moyenne ? { average: period.moyenne } : {}),
      ...(typeof period.position === "string" && period.position ? { position: period.position } : {}),
      ...(typeof period.dateDebut === "string" ? { startDate: period.dateDebut } : {}),
      ...(typeof period.dateFin === "string" ? { endDate: period.dateFin } : {}),
      open: period.ouverte === true,
      ...(typeof period.dateCalculMoyenne === "string" && period.dateCalculMoyenne ? { averageCalculatedAt: period.dateCalculMoyenne } : {}),
      appreciations: normalizeAppreciations(period.appreciations),
      positionsBySubSubject: Array.isArray(period.positionSSMat) ? period.positionSSMat : [],
      programElements: Array.isArray(period.elementsProgramme) ? period.elementsProgramme : [],
    }];
  });
}

function normalizeAppreciations(value: unknown): TeacherGradebookAppreciationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const appreciation = entry as Record<string, unknown>;
    if (typeof appreciation.code !== "string") return [];
    return [{
      code: appreciation.code,
      ...(typeof appreciation.libelle === "string" && appreciation.libelle ? { label: appreciation.libelle } : {}),
      ...(decodeBase64Text(appreciation.contenu) ? { content: decodeBase64Text(appreciation.contenu) } : {}),
    }];
  });
}

function decodeBase64Text(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;

  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    return decoded.length > 0 ? decoded : undefined;
  } catch {
    return undefined;
  }
}