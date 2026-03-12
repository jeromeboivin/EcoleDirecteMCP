import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface StudentProfilePayload {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  particle?: string;
  gender?: string;
  boarderStatus?: string;
  birthDate?: string;
  email?: string;
  mobile?: string;
  primarySchool: boolean;
  principalProfessor: boolean;
  photoUrl?: string;
  classId?: number;
  classLabel?: string;
  classIsGraded?: boolean;
  establishmentId?: number;
}

export interface NormalizedStudentProfileResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: StudentProfilePayload;
  message?: string;
}

export function normalizeStudentProfileResponse(raw: RawApiResponse): NormalizedStudentProfileResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  const id = asNumber(data?.id);
  const firstName = asString(data?.prenom);
  const lastName = asString(data?.nom);
  if (id === undefined || !firstName || !lastName) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: "Student profile payload is missing required identity fields.",
    };
  }

  const particle = asString(data?.particule);
  const photo = asString(data?.photo);
  const fullName = [firstName, particle, lastName]
    .filter((part): part is string => !!part && part.length > 0)
    .join(" ");

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      id,
      firstName,
      lastName,
      fullName,
      ...(particle ? { particle } : {}),
      ...(asString(data?.sexe) ? { gender: asString(data?.sexe) } : {}),
      ...(asString(data?.regime) ? { boarderStatus: asString(data?.regime) } : {}),
      ...(asString(data?.dateDeNaissance) ? { birthDate: asString(data?.dateDeNaissance) } : {}),
      ...(asString(data?.email) ? { email: asString(data?.email) } : {}),
      ...(asString(data?.mobile) ? { mobile: asString(data?.mobile) } : {}),
      primarySchool: asBooleanLike(data?.isPrimaire) ?? false,
      principalProfessor: asBooleanLike(data?.isPP) ?? false,
      ...(photo ? { photoUrl: normalizePhotoUrl(photo) } : {}),
      ...(asNumber(data?.classeId) !== undefined ? { classId: asNumber(data?.classeId) } : {}),
      ...(asString(data?.classeLibelle) ? { classLabel: asString(data?.classeLibelle) } : {}),
      ...(asBooleanLike(data?.classeEstNote) !== undefined ? { classIsGraded: asBooleanLike(data?.classeEstNote) } : {}),
      ...(asNumber(data?.idEtablissement) !== undefined ? { establishmentId: asNumber(data?.idEtablissement) } : {}),
    },
  };
}

function normalizePhotoUrl(value: string): string {
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1) return true;
  if (value === "0" || value === 0) return false;
  return undefined;
}