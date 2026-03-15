import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherClassStudent {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  sexe?: string;
  classId?: number;
  className?: string;
  classCode?: string;
  photo?: string;
}

export interface TeacherClassStudentsEntity {
  id: number;
  type?: string;
  code?: string;
  label?: string;
  isFlexible?: boolean;
  isPrimary?: boolean;
}

export interface TeacherClassStudentsPayload {
  students: TeacherClassStudent[];
  entity?: TeacherClassStudentsEntity;
}

export interface NormalizedTeacherClassStudentsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherClassStudentsPayload;
  message?: string;
}

export function normalizeTeacherClassStudentsResponse(raw: RawApiResponse): NormalizedTeacherClassStudentsResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const source = asObject(raw.data);
  const studentsSource = Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(source?.eleves)
      ? source.eleves
      : [];
  const students = studentsSource.flatMap((entry) => normalizeClassStudent(entry));
  const entity = normalizeEntity(source?.entity);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      students,
      ...(entity ? { entity } : {}),
    },
  };
}

function normalizeClassStudent(entry: unknown): TeacherClassStudent[] {
  const e = asObject(entry);
  if (typeof e?.id !== "number") return [];

  const firstName = typeof e.prenom === "string" ? e.prenom.trim() : "";
  const lastName = typeof e.nom === "string" ? e.nom.trim() : "";
  const name = `${firstName} ${lastName}`.trim();
  if (!name) return [];

  const classe = asObject(e.classe);
  const classId = typeof e.classeId === "number"
    ? e.classeId
    : typeof classe?.id === "number"
      ? classe.id
      : undefined;
  const className = typeof e.classeLibelle === "string" && e.classeLibelle.length > 0
    ? e.classeLibelle
    : typeof classe?.libelle === "string"
      ? classe.libelle
      : undefined;
  const classCode = typeof e.classeCode === "string" && e.classeCode.length > 0
    ? e.classeCode
    : typeof classe?.code === "string"
      ? classe.code
      : undefined;

  return [{
    id: e.id,
    name,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(typeof e.sexe === "string" ? { sexe: e.sexe } : {}),
    ...(classId !== undefined ? { classId } : {}),
    ...(className ? { className } : {}),
    ...(classCode ? { classCode } : {}),
    ...(typeof e.photo === "string" && e.photo.length > 0 ? { photo: e.photo } : {}),
  }];
}

function normalizeEntity(entry: unknown): TeacherClassStudentsEntity | undefined {
  const source = asObject(entry);
  if (typeof source?.id !== "number") return undefined;

  return {
    id: source.id,
    ...(typeof source.type === "string" ? { type: source.type } : {}),
    ...(typeof source.code === "string" ? { code: source.code } : {}),
    ...(typeof source.libelle === "string" ? { label: source.libelle } : {}),
    ...(typeof source.isFlexible === "boolean" ? { isFlexible: source.isFlexible } : {}),
    ...(typeof source.isPrimaire === "boolean" ? { isPrimary: source.isPrimaire } : {}),
  };
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}
