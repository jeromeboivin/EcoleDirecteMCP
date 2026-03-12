import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface InvoiceEntry {
  id?: number;
  libelle?: string;
  date?: string;
  type?: string;
  signatureDemandee?: boolean;
  etatSignatures?: unknown;
  signature?: unknown;
}

export interface FamilyInvoicesPayload {
  invoices: InvoiceEntry[];
}

export interface NormalizedFamilyInvoicesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: FamilyInvoicesPayload;
  message?: string;
}

export function normalizeFamilyInvoicesResponse(raw: RawApiResponse): NormalizedFamilyInvoicesResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const invoices = normalizeInvoiceArray(raw.data);
  return {
    ok: true,
    code: raw.code,
    raw,
    data: { invoices },
  };
}

function normalizeInvoiceArray(value: unknown): InvoiceEntry[] {
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
      ...(record.etatSignatures !== undefined ? { etatSignatures: record.etatSignatures } : {}),
      ...(record.signature !== undefined ? { signature: record.signature } : {}),
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
