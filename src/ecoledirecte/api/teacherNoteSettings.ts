import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherNoteComponent {
  code?: string;
  label?: string;
  coefficient?: number;
}

export interface TeacherHomeworkType {
  code?: string;
  label?: string;
}

export interface TeacherEstablishmentGradingParams {
  establishmentId?: number;
  maxGrade?: number;
  noteNegativeCount: boolean;
  defaultCoefficient?: number;
}

export interface TeacherNoteSettingsPayload {
  components: TeacherNoteComponent[];
  homeworkTypes: TeacherHomeworkType[];
  establishmentParams: TeacherEstablishmentGradingParams[];
}

export interface NormalizedTeacherNoteSettingsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherNoteSettingsPayload;
  message?: string;
}

export function normalizeTeacherNoteSettingsResponse(raw: RawApiResponse): NormalizedTeacherNoteSettingsResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = raw.data as Record<string, unknown> | undefined;
  if (!data) {
    return { ok: true, code: raw.code, raw, data: { components: [], homeworkTypes: [], establishmentParams: [] } };
  }

  const components = normalizeComponents(data.composantes);
  const homeworkTypes = normalizeHomeworkTypes(data.typesDevoirs);
  const establishmentParams = normalizeEstablishmentParams(data.etabsParams);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: { components, homeworkTypes, establishmentParams },
  };
}

function normalizeComponents(value: unknown): TeacherNoteComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    return [{
      ...(typeof e.code === "string" ? { code: e.code } : {}),
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
      ...(typeof e.coef === "number" ? { coefficient: e.coef } : {}),
    }];
  });
}

function normalizeHomeworkTypes(value: unknown): TeacherHomeworkType[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    return [{
      ...(typeof e.code === "string" ? { code: e.code } : {}),
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
    }];
  });
}

function normalizeEstablishmentParams(value: unknown): TeacherEstablishmentGradingParams[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    return [{
      ...(typeof e.idEtab === "number" ? { establishmentId: e.idEtab } : {}),
      ...(typeof e.noteSur === "number" ? { maxGrade: e.noteSur } : {}),
      noteNegativeCount: e.noteNegativeCompte === true,
      ...(typeof e.coefficientDefaut === "number" ? { defaultCoefficient: e.coefficientDefaut } : {}),
    }];
  });
}
