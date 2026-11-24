import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherNoteComponent {
  code?: string;
  label?: string;
  coefficient?: number;
}

export interface TeacherHomeworkType {
  id?: number;
  code?: string;
  label?: string;
  coefficient?: number;
}

export interface TeacherEstablishmentGradingParams {
  establishmentId?: number;
  maxGrade?: number;
  noteNegativeCount: boolean;
  defaultCoefficient?: number;
  scaleEditable?: boolean;
  coefficientEditable?: boolean;
  homeworkTypeRequired?: boolean;
  homeworkTypes?: TeacherHomeworkType[];
  publicationMode?: "school_policy" | "date";
  publicationDelayDays?: number;
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
  const note = data.note as Record<string, unknown> | undefined;
  const homeworkTypes = normalizeHomeworkTypes(note?.typesDevoirs ?? data.typesDevoirs);
  const establishmentParams = normalizeEstablishmentParams(note?.etabsParams ?? data.etabsParams);

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
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    return [{
      ...(typeof e.id === "number" ? { id: e.id } : {}),
      ...(typeof e.code === "string" ? { code: e.code } : {}),
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
      ...(typeof e.coef === "number" ? { coefficient: e.coef } : {}),
    }];
  });
}

function normalizeEstablishmentParams(value: unknown): TeacherEstablishmentGradingParams[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    const establishmentId = typeof e.id === "number" ? e.id : e.idEtab;
    const maxGrade = typeof e.borneMax === "number" ? e.borneMax : e.noteSur;
    const publicationMode = e.avecDecalage === "2" ? "date" as const
      : e.avecDecalage === "0" || e.avecDecalage === "1" ? "school_policy" as const : undefined;
    return [{
      ...(typeof establishmentId === "number" ? { establishmentId } : {}),
      ...(typeof maxGrade === "number" ? { maxGrade } : {}),
      noteNegativeCount: e.noteNegativeCompte === true,
      ...(typeof e.coefficientDefaut === "number" ? { defaultCoefficient: e.coefficientDefaut } : {}),
      ...(typeof e.isBorneModifiable === "boolean" ? { scaleEditable: e.isBorneModifiable } : {}),
      ...(typeof e.isCoefModifiable === "boolean" ? { coefficientEditable: e.isCoefModifiable } : {}),
      ...(typeof e.isTypeDevoirObligatoire === "boolean" ? { homeworkTypeRequired: e.isTypeDevoirObligatoire } : {}),
      ...(Array.isArray(e.typesDevoirs) ? { homeworkTypes: normalizeHomeworkTypes(e.typesDevoirs) } : {}),
      ...(publicationMode ? { publicationMode } : {}),
      ...(e.avecDecalage === "1" && typeof e.nbreJoursDecalage === "number" ? { publicationDelayDays: e.nbreJoursDecalage } : {}),
    }];
  });
}
