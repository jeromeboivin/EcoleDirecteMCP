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

export interface SubjectTeacher {
  id: number;
  name: string;
}

export interface SubjectDiscipline {
  id: number;
  code: string;
  name: string;
  average?: string;
  classAverage?: string;
  classMin?: string;
  classMax?: string;
  coefficient?: string;
  rank?: number;
  effectif?: number;
  teachers: SubjectTeacher[];
  appreciations: string[];
  classAppreciation?: string;
  subCode?: string;
  isGroup: boolean;
  groupId?: number;
  isOption: boolean;
  isSubSubject: boolean;
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
  rank?: number;
  effectif?: number;
  disciplines: SubjectDiscipline[];
  appreciationPP?: string;
  appreciationCE?: string;
  appreciationVS?: string;
  councilDecision?: string;
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
  const disciplines = Array.isArray(overview?.disciplines)
    ? overview.disciplines.flatMap((d: unknown) => normalizeDiscipline(d))
    : [];

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
    ...(asNumber(overview?.rang) !== undefined ? { rank: asNumber(overview?.rang) } : {}),
    ...(asNumber(overview?.effectif) !== undefined ? { effectif: asNumber(overview?.effectif) } : {}),
    disciplines,
    ...(decodeBase64Field(overview?.appreciationPP) ? { appreciationPP: decodeBase64Field(overview?.appreciationPP) } : {}),
    ...(decodeBase64Field(overview?.appreciationCE) ? { appreciationCE: decodeBase64Field(overview?.appreciationCE) } : {}),
    ...(decodeBase64Field(overview?.appreciationVS) ? { appreciationVS: decodeBase64Field(overview?.appreciationVS) } : {}),
    ...(decodeBase64Field(overview?.decisionDuConseil) ? { councilDecision: decodeBase64Field(overview?.decisionDuConseil) } : {}),
  }];
}

function normalizeDiscipline(value: unknown): SubjectDiscipline[] {
  const d = asRecord(value);
  if (!d) return [];
  const id = asNumber(d.id);
  if (id === undefined) return [];

  const code = asString(d.codeMatiere) ?? "";
  const name = asString(d.discipline) ?? "";

  const teachers: SubjectTeacher[] = Array.isArray(d.professeurs)
    ? d.professeurs.flatMap((p: unknown) => {
        const pr = asRecord(p);
        const pId = asNumber(pr?.id);
        const pName = asString(pr?.nom);
        return pId !== undefined && pName ? [{ id: pId, name: pName }] : [];
      })
    : [];

  const appreciations: string[] = Array.isArray(d.appreciations)
    ? d.appreciations
        .map((a: unknown) => typeof a === "string" ? decodeBase64Field(a) : undefined)
        .filter((a): a is string => a !== undefined)
    : [];

  const classAppreciation = decodeBase64Field(d.appreciationClasse);

  return [{
    id,
    code,
    name,
    ...(asString(d.moyenne) ? { average: asString(d.moyenne) } : {}),
    ...(asString(d.moyenneClasse) ? { classAverage: asString(d.moyenneClasse) } : {}),
    ...(asString(d.moyenneMin) ? { classMin: asString(d.moyenneMin) } : {}),
    ...(asString(d.moyenneMax) ? { classMax: asString(d.moyenneMax) } : {}),
    ...(asString(d.coef) ? { coefficient: asString(d.coef) } : {}),
    ...(asNumber(d.rang) !== undefined ? { rank: asNumber(d.rang) } : {}),
    ...(asNumber(d.effectif) !== undefined ? { effectif: asNumber(d.effectif) } : {}),
    teachers,
    appreciations,
    ...(classAppreciation ? { classAppreciation } : {}),
    ...(asString(d.codeSousMatiere) ? { subCode: asString(d.codeSousMatiere) } : {}),
    isGroup: asBooleanLike(d.groupeMatiere) ?? false,
    ...(asNumber(d.idGroupeMatiere) !== undefined ? { groupId: asNumber(d.idGroupeMatiere) } : {}),
    isOption: asBooleanLike(d.option) ?? false,
    isSubSubject: asBooleanLike(d.sousMatiere) ?? false,
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

function decodeBase64Field(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/[^A-Za-z0-9+/=\s]/.test(trimmed)) return trimmed;
  try {
    const decoded = Buffer.from(trimmed.replace(/\s+/g, ""), "base64").toString("utf-8").trim();
    return decoded || trimmed;
  } catch {
    return trimmed;
  }
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