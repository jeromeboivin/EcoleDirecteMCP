import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherRoom {
  id: number;
  code?: string;
  label?: string;
  building?: string;
  floor?: string;
  reservable: boolean;
}

export interface TeacherRoomsPayload {
  rooms: TeacherRoom[];
}

export interface NormalizedTeacherRoomsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherRoomsPayload;
  message?: string;
}

export function normalizeTeacherRoomsResponse(raw: RawApiResponse): NormalizedTeacherRoomsResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const source = Array.isArray(raw.data) ? raw.data : [];
  const rooms = source.flatMap((entry) => normalizeRoom(entry));

  return {
    ok: true,
    code: raw.code,
    raw,
    data: { rooms },
  };
}

function normalizeRoom(entry: unknown): TeacherRoom[] {
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== "number") return [];

  return [{
    id: e.id,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
    ...(typeof e.batiment === "string" ? { building: e.batiment } : {}),
    ...(typeof e.etage === "string" ? { floor: e.etage } : {}),
    reservable: e.reservable === true,
  }];
}
