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

export interface TeacherClassStudentsPayload {
  students: TeacherClassStudent[];
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

  const source = Array.isArray(raw.data) ? raw.data : [];
  const students = source.flatMap((entry) => normalizeClassStudent(entry));

  return {
    ok: true,
    code: raw.code,
    raw,
    data: { students },
  };
}

function normalizeClassStudent(entry: unknown): TeacherClassStudent[] {
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== "number") return [];

  const firstName = typeof e.prenom === "string" ? e.prenom.trim() : "";
  const lastName = typeof e.nom === "string" ? e.nom.trim() : "";
  const name = `${firstName} ${lastName}`.trim();
  if (!name) return [];

  const classe = e.classe as Record<string, unknown> | undefined;

  return [{
    id: e.id,
    name,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(typeof e.sexe === "string" ? { sexe: e.sexe } : {}),
    ...(typeof classe?.id === "number" ? { classId: classe.id } : {}),
    ...(typeof classe?.libelle === "string" ? { className: classe.libelle } : {}),
    ...(typeof classe?.code === "string" ? { classCode: classe.code } : {}),
    ...(typeof e.photo === "string" && e.photo.length > 0 ? { photo: e.photo } : {}),
  }];
}
