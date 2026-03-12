import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface CarnetCorrespondanceAuthor {
  id?: number;
  role?: string;
  name: string;
}

export interface CarnetCorrespondanceEntry {
  studentId?: number;
  studentName?: string;
  dateCreated?: string;
  content: string;
  type?: string;
  signatureRequired: boolean;
  fileUrl?: string;
  appointmentSessionId?: number;
  author?: CarnetCorrespondanceAuthor;
}

export interface CarnetCorrespondancePayload {
  correspondences: CarnetCorrespondanceEntry[];
  followUps: Array<Record<string, unknown>>;
}

export interface NormalizedCarnetCorrespondanceResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: CarnetCorrespondancePayload;
  message?: string;
}

export function normalizeCarnetCorrespondanceResponse(raw: RawApiResponse): NormalizedCarnetCorrespondanceResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      correspondences: Array.isArray(data?.correspondances)
        ? data.correspondances.flatMap((entry) => normalizeCorrespondence(entry))
        : [],
      followUps: Array.isArray(data?.suivis)
        ? data.suivis.flatMap((entry) => {
            const record = asRecord(entry);
            return record ? [record] : [];
          })
        : [],
    },
  };
}

function normalizeCorrespondence(value: unknown): CarnetCorrespondanceEntry[] {
  const entry = asRecord(value);
  const content = asString(entry?.contenu);
  if (!content) return [];

  const firstName = asString(entry?.prenom);
  const lastName = asString(entry?.nom);
  const studentName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return [{
    ...(asNumber(entry?.idEleve) !== undefined ? { studentId: asNumber(entry?.idEleve) } : {}),
    ...(studentName ? { studentName } : {}),
    ...(asString(entry?.dateCreation) ? { dateCreated: asString(entry?.dateCreation) } : {}),
    content,
    ...(asString(entry?.type) ? { type: asString(entry?.type) } : {}),
    signatureRequired: asBooleanLike(entry?.isSignatureDemandee) ?? false,
    ...(asString(entry?.urlFichier) ? { fileUrl: asString(entry?.urlFichier) } : {}),
    ...(asNumber(entry?.idSessionRDV) !== undefined ? { appointmentSessionId: asNumber(entry?.idSessionRDV) } : {}),
    ...(normalizeAuthor(entry?.auteur) ? { author: normalizeAuthor(entry?.auteur) } : {}),
  }];
}

function normalizeAuthor(value: unknown): CarnetCorrespondanceAuthor | undefined {
  const author = asRecord(value);
  if (!author) return undefined;
  const name = [asString(author?.prenom), asString(author?.particule), asString(author?.nom)]
    .filter((part): part is string => !!part && part.length > 0)
    .join(" ")
    .trim();
  if (!name) return undefined;

  return {
    ...(asNumber(author?.id) !== undefined ? { id: asNumber(author?.id) } : {}),
    ...(asString(author?.role) ? { role: asString(author?.role) } : {}),
    name,
  };
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