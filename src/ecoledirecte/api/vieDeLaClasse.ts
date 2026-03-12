import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface VieDeLaClassePayload {
  sections: Record<string, unknown>;
  sectionKeys: string[];
  empty: boolean;
}

export interface NormalizedVieDeLaClasseResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: VieDeLaClassePayload;
  message?: string;
}

export function normalizeVieDeLaClasseResponse(raw: RawApiResponse): NormalizedVieDeLaClasseResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const sections = asRecord(raw.data) ?? {};
  const sectionKeys = Object.keys(sections);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      sections,
      sectionKeys,
      empty: sectionKeys.length === 0,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}