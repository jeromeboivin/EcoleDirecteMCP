import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface DocumentEntry {
  id?: number;
  libelle?: string;
  date?: string;
  type?: string;
  signatureDemandee?: boolean;
  archive?: boolean;
}

export interface FamilyDocumentsPayload {
  factures: DocumentEntry[];
  notes: DocumentEntry[];
  viescolaire: DocumentEntry[];
  administratifs: DocumentEntry[];
  inscriptions: DocumentEntry[];
  entreprises: DocumentEntry[];
  listesPiecesAVerser: unknown[];
}

export interface NormalizedFamilyDocumentsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: FamilyDocumentsPayload;
  message?: string;
}

export function normalizeFamilyDocumentsResponse(raw: RawApiResponse): NormalizedFamilyDocumentsResponse {
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
      factures: normalizeDocumentArray(data?.factures),
      notes: normalizeDocumentArray(data?.notes),
      viescolaire: normalizeDocumentArray(data?.viescolaire),
      administratifs: normalizeDocumentArray(data?.administratifs),
      inscriptions: normalizeDocumentArray(data?.inscriptions),
      entreprises: normalizeDocumentArray(data?.entreprises),
      listesPiecesAVerser: Array.isArray(data?.listesPiecesAVerser) ? data.listesPiecesAVerser : [],
    },
  };
}

function normalizeDocumentArray(value: unknown): DocumentEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    if (!record) return [];
    return [{
      ...(asNumber(record.id) !== undefined ? { id: asNumber(record.id) } : {}),
      ...(asString(record.libelle) ? { libelle: asString(record.libelle) } : {}),
      ...(asString(record.date) ? { date: asString(record.date) } : {}),
      ...(asString(record.type) ? { type: asString(record.type) } : {}),
      ...(asBooleanLike(record.signatureDemandee) !== undefined ? { signatureDemandee: asBooleanLike(record.signatureDemandee) } : {}),
      ...(asBooleanLike(record.archive) !== undefined ? { archive: asBooleanLike(record.archive) } : {}),
    }];
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
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
