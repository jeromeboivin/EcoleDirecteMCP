import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface NotesSettings {
  studentAverage?: boolean;
  studentAverageInGeneralAverage?: boolean;
  classAverage?: boolean;
  minAverage?: boolean;
  maxAverage?: boolean;
  generalAverage?: boolean;
  coefficientNote?: boolean;
}

export interface NotePeriodSummary {
  id: string;
  label: string;
  code?: string;
  shortLabel?: string;
  startDate?: string;
  endDate?: string;
  annual: boolean;
  closed: boolean;
  exam: boolean;
  generalAverage?: string;
  classAverage?: string;
  minAverage?: string;
  maxAverage?: string;
  calculatedAt?: string;
  councilDate?: string;
  councilRoom?: string;
}

export interface StudentGrade {
  id: number;
  assignment: string;
  subject: string;
  periodCode?: string;
  subjectCode?: string;
  subSubjectCode?: string;
  type?: string;
  value?: string;
  outOf?: string;
  coefficient?: string;
  classAverage?: string;
  minClass?: string;
  maxClass?: string;
  date?: string;
  enteredAt?: string;
  comment?: string;
  isLetterGrade: boolean;
  isWeighted: boolean;
  nonSignificant: boolean;
  elementCount: number;
  hasQcm: boolean;
  hasSubjectAttachment: boolean;
  hasCorrectionAttachment: boolean;
}

export interface NotesPayload {
  settings: NotesSettings;
  periods: NotePeriodSummary[];
  grades: StudentGrade[];
  expired: boolean;
  classProfile?: string;
}

export interface NormalizedNotesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: NotesPayload;
  message?: string;
}

export function normalizeNotesResponse(raw: RawApiResponse): NormalizedNotesResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  const settings = normalizeSettings(data?.parametrage);
  const periods = Array.isArray(data?.periodes)
    ? data.periodes.flatMap((period) => normalizePeriod(period))
    : [];
  const grades = Array.isArray(data?.notes)
    ? data.notes.flatMap((grade) => normalizeGrade(grade))
    : [];

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      settings,
      periods,
      grades,
      expired: asBooleanLike(data?.expired) ?? false,
      ...(asString(data?.foStat) ? { classProfile: asString(data?.foStat) } : {}),
    },
  };
}

function normalizeSettings(value: unknown): NotesSettings {
  const settings = asRecord(value);
  return {
    studentAverage: asBooleanLike(settings?.moyenneEleve),
    studentAverageInGeneralAverage: asBooleanLike(settings?.moyenneEleveDansMoyenne),
    classAverage: asBooleanLike(settings?.moyenneClasse),
    minAverage: asBooleanLike(settings?.moyenneMin),
    maxAverage: asBooleanLike(settings?.moyenneMax),
    generalAverage: asBooleanLike(settings?.moyenneGenerale),
    coefficientNote: asBooleanLike(settings?.coefficientNote),
  };
}

function normalizePeriod(value: unknown): NotePeriodSummary[] {
  const period = asRecord(value);
  const id = asString(period?.idPeriode);
  const label = asString(period?.periode) ?? asString(period?.libelle);
  if (!id || !label) return [];

  const overview = asRecord(period?.ensembleMatieres);

  return [{
    id,
    label,
    ...(asString(period?.codePeriode) ? { code: asString(period?.codePeriode) } : {}),
    ...(asString(period?.libelleCourt) ? { shortLabel: asString(period?.libelleCourt) } : {}),
    ...(asString(period?.dateDebut) ? { startDate: asString(period?.dateDebut) } : {}),
    ...(asString(period?.dateFin) ? { endDate: asString(period?.dateFin) } : {}),
    annual: asBooleanLike(period?.annuel) ?? false,
    closed: asBooleanLike(period?.cloture) ?? false,
    exam: asBooleanLike(period?.examenBlanc) ?? false,
    ...(asString(overview?.moyenneGenerale) ? { generalAverage: asString(overview?.moyenneGenerale) } : {}),
    ...(asString(overview?.moyenneClasse) ? { classAverage: asString(overview?.moyenneClasse) } : {}),
    ...(asString(overview?.moyenneMin) ? { minAverage: asString(overview?.moyenneMin) } : {}),
    ...(asString(overview?.moyenneMax) ? { maxAverage: asString(overview?.moyenneMax) } : {}),
    ...(asString(overview?.dateCalcul) ? { calculatedAt: asString(overview?.dateCalcul) } : {}),
    ...(asString(period?.dateConseil) ? { councilDate: asString(period?.dateConseil) } : {}),
    ...(asString(period?.salleConseil) ? { councilRoom: asString(period?.salleConseil) } : {}),
  }];
}

function normalizeGrade(value: unknown): StudentGrade[] {
  const grade = asRecord(value);
  const id = asNumber(grade?.id);
  if (id === undefined) return [];

  return [{
    id,
    assignment: asString(grade?.devoir) ?? "",
    subject: asString(grade?.libelleMatiere) ?? "",
    ...(asString(grade?.codePeriode) ? { periodCode: asString(grade?.codePeriode) } : {}),
    ...(asString(grade?.codeMatiere) ? { subjectCode: asString(grade?.codeMatiere) } : {}),
    ...(asString(grade?.codeSousMatiere) ? { subSubjectCode: asString(grade?.codeSousMatiere) } : {}),
    ...(asString(grade?.typeDevoir) ? { type: asString(grade?.typeDevoir) } : {}),
    ...(asString(grade?.valeur) ? { value: asString(grade?.valeur) } : {}),
    ...(asString(grade?.noteSur) ? { outOf: asString(grade?.noteSur) } : {}),
    ...(asString(grade?.coef) ? { coefficient: asString(grade?.coef) } : {}),
    ...(asString(grade?.moyenneClasse) ? { classAverage: asString(grade?.moyenneClasse) } : {}),
    ...(asString(grade?.minClasse) ? { minClass: asString(grade?.minClasse) } : {}),
    ...(asString(grade?.maxClasse) ? { maxClass: asString(grade?.maxClasse) } : {}),
    ...(asString(grade?.date) ? { date: asString(grade?.date) } : {}),
    ...(asString(grade?.dateSaisie) ? { enteredAt: asString(grade?.dateSaisie) } : {}),
    ...(asString(grade?.commentaire) ? { comment: asString(grade?.commentaire) } : {}),
    isLetterGrade: asBooleanLike(grade?.enLettre) ?? false,
    isWeighted: asBooleanLike(grade?.valeurisee) ?? false,
    nonSignificant: asBooleanLike(grade?.nonSignificatif) ?? false,
    elementCount: Array.isArray(grade?.elementsProgramme) ? grade.elementsProgramme.length : 0,
    hasQcm: asRecord(grade?.qcm) !== undefined,
    hasSubjectAttachment: asString(grade?.uncSujet) !== undefined,
    hasCorrectionAttachment: asString(grade?.uncCorrige) !== undefined,
  }];
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