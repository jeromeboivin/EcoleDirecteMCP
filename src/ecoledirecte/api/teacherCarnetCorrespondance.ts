import type { CarnetCorrespondanceEntry } from "./carnetCorrespondance.js";
import { normalizeCarnetCorrespondanceResponse } from "./carnetCorrespondance.js";
import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherCarnetOption {
  id?: number;
  code?: string;
  label?: string;
}

export interface TeacherCarnetCorrespondanceClassPayload {
  correspondenceTypes: TeacherCarnetOption[];
  sanctionTypes: TeacherCarnetOption[];
  sanctionReasons: TeacherCarnetOption[];
  incidentReasons: TeacherCarnetOption[];
  followUpCategories: TeacherCarnetOption[];
  correspondences: CarnetCorrespondanceEntry[];
  correspondenceCount: number;
  disciplinaryRequests: Array<Record<string, unknown>>;
  disciplinaryRequestCount: number;
  followUps: Array<Record<string, unknown>>;
  followUpCount: number;
  settings: Record<string, unknown>;
}

export interface NormalizedTeacherCarnetCorrespondanceClassResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherCarnetCorrespondanceClassPayload;
  message?: string;
}

export function normalizeTeacherCarnetCorrespondanceClassResponse(
  raw: RawApiResponse,
): NormalizedTeacherCarnetCorrespondanceClassResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  const carnet = normalizeCarnetCorrespondanceResponse({
    ...raw,
    data: {
      correspondances: data?.correspondances,
      suivis: data?.suivis,
    },
  });

  if (!carnet.ok || !carnet.data) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: carnet.message ?? "Malformed teacher carnet correspondance payload.",
    };
  }

  const disciplinaryRequests = normalizeRecordArray(data?.demandesSanctionOrIncident);
  const followUps = carnet.data.followUps;

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      correspondenceTypes: normalizeOptionArray(data?.typesCorrespondance),
      sanctionTypes: normalizeOptionArray(data?.typesSanction),
      sanctionReasons: normalizeOptionArray(data?.motifsSanction),
      incidentReasons: normalizeOptionArray(data?.motifsIncident),
      followUpCategories: normalizeOptionArray(data?.categoriesSuivi),
      correspondences: carnet.data.correspondences,
      correspondenceCount: carnet.data.correspondences.length,
      disciplinaryRequests,
      disciplinaryRequestCount: disciplinaryRequests.length,
      followUps,
      followUpCount: followUps.length,
      settings: asRecord(data?.parametrage) ?? {},
    },
  };
}

function normalizeOptionArray(value: unknown): TeacherCarnetOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => normalizeOption(entry));
}

function normalizeOption(value: unknown): TeacherCarnetOption[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [{ label: trimmed }] : [];
  }

  const entry = asRecord(value);
  if (!entry) return [];

  const normalized: TeacherCarnetOption = {
    ...(asNumber(entry.id) !== undefined ? { id: asNumber(entry.id) } : {}),
    ...(asString(entry.code) ? { code: asString(entry.code) } : {}),
    ...(asString(entry.libelle)
      ? { label: asString(entry.libelle) }
      : asString(entry.label)
        ? { label: asString(entry.label) }
        : asString(entry.nom)
          ? { label: asString(entry.nom) }
          : {}),
  };

  return Object.keys(normalized).length > 0 ? [normalized] : [];
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

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}