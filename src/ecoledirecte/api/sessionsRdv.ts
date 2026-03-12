import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface SessionsRdvPayload {
  sessions: Array<Record<string, unknown>>;
  authors: Array<Record<string, unknown>>;
  invitees: Array<Record<string, unknown>>;
  unavailableInvitees: Array<Record<string, unknown>>;
}

export interface NormalizedSessionsRdvResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: SessionsRdvPayload;
  message?: string;
}

export function normalizeSessionsRdvResponse(raw: RawApiResponse): NormalizedSessionsRdvResponse {
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
      sessions: normalizeRecordArray(data?.sessions),
      authors: normalizeRecordArray(data?.auteurs),
      invitees: normalizeRecordArray(data?.invites),
      unavailableInvitees: normalizeRecordArray(data?.indisposInvites),
    },
  };
}

function normalizeRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    return record ? [record] : [];
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}