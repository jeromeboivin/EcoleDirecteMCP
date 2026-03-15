import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherLslCatalogEntry {
  code: string;
  label?: string;
  maxCharacters?: number;
}

export interface TeacherLslNotationEntry {
  code: string;
  label?: string;
}

export interface TeacherLslCompetency {
  code?: string;
  label?: string;
  evaluationCode?: string;
  evaluationLabel?: string;
  order?: number;
}

export interface TeacherLslAppreciationEntry {
  code?: string;
  label?: string;
  text?: string;
  date?: string;
  authorName?: string;
  maxCharacters?: number;
}

export interface TeacherLslAvisEntry {
  type?: string;
  code?: string;
  label?: string;
  text?: string;
  authorName?: string;
  date?: string;
  weeks?: number;
  abroadPartCompleted?: boolean;
}

export interface TeacherLslEngagementEntry {
  type?: string;
  code?: string;
  label?: string;
  active: boolean;
}

export interface TeacherLslMobility {
  countryCode?: string;
  countryLabel?: string;
  presentationNote?: string;
  themeNote?: string;
  reflectionNote?: string;
  reportTitle?: string;
}

export interface TeacherLslClassSubject {
  code: string;
  internalCode?: string;
  label?: string;
  electionMode?: string;
  competencyCount: number;
}

export interface TeacherLslStudentSubject {
  code: string;
  internalCode?: string;
  label?: string;
  electionMode?: string;
  annualAppreciation?: string;
  classAverage?: string;
  classAveragePeriod1?: string;
  classAveragePeriod2?: string;
  classAveragePeriod3?: string;
  lessThan8?: number;
  between8And12?: number;
  above12?: number;
  dnlNotation?: string;
  appreciations: TeacherLslAppreciationEntry[];
  competencies: TeacherLslCompetency[];
}

export interface TeacherLslStudent {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  photo?: string;
  arrivalOrder?: string;
  gender?: string;
  classId?: number;
  formationCode?: string;
  languageTechno?: string;
  mobility?: TeacherLslMobility;
  examOpinions: TeacherLslAvisEntry[];
  schoolEngagements: TeacherLslEngagementEntry[];
  detailedSchoolEngagements: TeacherLslEngagementEntry[];
  subjects: TeacherLslStudentSubject[];
  subjectCount: number;
}

export interface TeacherLslClass {
  id: number;
  label: string;
  principalProfessor: boolean;
  isTerminalClass: boolean;
  isGeneralOrTechno: boolean;
  isTechno: boolean;
  isProfessional: boolean;
  students: TeacherLslStudent[];
  studentCount: number;
  subjects: TeacherLslClassSubject[];
  subjectCount: number;
}

export interface TeacherLslPayload {
  classes: TeacherLslClass[];
  appreciations: TeacherLslCatalogEntry[];
  examOpinions: TeacherLslCatalogEntry[];
  schoolEngagements: TeacherLslCatalogEntry[];
  detailedSchoolEngagements: TeacherLslCatalogEntry[];
  notations: TeacherLslNotationEntry[];
  headTeacherOnlyExamOpinion: boolean;
  principalProfessorOnlyEngagements: boolean;
}

export interface NormalizedTeacherLslResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherLslPayload;
  message?: string;
}

export function normalizeTeacherLslResponse(raw: RawApiResponse): NormalizedTeacherLslResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  const appreciations = normalizeCatalogEntries(data?.appreciations);
  const examOpinions = normalizeCatalogEntries(data?.avisExamens);
  const schoolEngagements = normalizeCatalogEntries(data?.engagementsScolaire);
  const detailedSchoolEngagements = normalizeCatalogEntries(data?.engagementsScolaireAvecPrecision);
  const notations = normalizeNotationEntries(data?.notations);
  const classes = Array.isArray(data?.classes)
    ? data.classes.flatMap((entry) => normalizeClass(entry, {
        appreciations,
        examOpinions,
        schoolEngagements,
        detailedSchoolEngagements,
        notations,
      }))
    : [];

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      classes,
      appreciations,
      examOpinions,
      schoolEngagements,
      detailedSchoolEngagements,
      notations,
      headTeacherOnlyExamOpinion: asBooleanLike(data?.saisieAvisCESeulementParPersonnel) ?? false,
      principalProfessorOnlyEngagements: asBooleanLike(data?.saisieAvisEngagementsSeulementPP) ?? false,
    },
  };
}

function normalizeCatalogEntries(value: unknown): TeacherLslCatalogEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const code = asString(record?.code);
    if (!code) return [];

    return [{
      code,
      ...(asString(record?.libelle) ? { label: asString(record?.libelle) } : {}),
      ...(asNumber(record?.nbMaxCaracteres) !== undefined ? { maxCharacters: asNumber(record?.nbMaxCaracteres) } : {}),
    }];
  });
}

function normalizeNotationEntries(value: unknown): TeacherLslNotationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const code = asString(record?.code);
    if (!code) return [];
    return [{ code, ...(asString(record?.libelle) ? { label: asString(record?.libelle) } : {}) }];
  });
}

function normalizeClass(
  value: unknown,
  catalogs: {
    appreciations: TeacherLslCatalogEntry[];
    examOpinions: TeacherLslCatalogEntry[];
    schoolEngagements: TeacherLslCatalogEntry[];
    detailedSchoolEngagements: TeacherLslCatalogEntry[];
    notations: TeacherLslNotationEntry[];
  },
): TeacherLslClass[] {
  const entry = asRecord(value);
  const id = asNumber(entry?.idClasse);
  const label = asString(entry?.libelle);
  if (id === undefined || !label) return [];

  const subjects = Array.isArray(entry?.matieres)
    ? entry.matieres.flatMap((subject) => normalizeClassSubject(subject))
    : [];
  const students = Array.isArray(entry?.eleves)
    ? entry.eleves.flatMap((student) => normalizeStudent(student, catalogs))
    : [];

  return [{
    id,
    label,
    principalProfessor: asBooleanLike(entry?.isPP) ?? false,
    isTerminalClass: asBooleanLike(entry?.isClasseTerminale) ?? false,
    isGeneralOrTechno: asBooleanLike(entry?.isFiliereGeneraleOuTechno) ?? false,
    isTechno: asBooleanLike(entry?.isFiliereTechno) ?? false,
    isProfessional: asBooleanLike(entry?.isFilierePro) ?? false,
    students,
    studentCount: students.length,
    subjects,
    subjectCount: subjects.length,
  }];
}

function normalizeClassSubject(value: unknown): TeacherLslClassSubject[] {
  const subject = asRecord(value);
  const code = asString(subject?.code);
  if (!code) return [];

  const competencies = Array.isArray(subject?.competences) ? subject.competences : [];
  return [{
    code,
    ...(asString(subject?.codeInterne) ? { internalCode: asString(subject?.codeInterne) } : {}),
    ...(asString(subject?.libelle) ? { label: asString(subject?.libelle) } : {}),
    ...(asString(subject?.modaliteElection) ? { electionMode: asString(subject?.modaliteElection) } : {}),
    competencyCount: competencies.length,
  }];
}

function normalizeStudent(
  value: unknown,
  catalogs: {
    appreciations: TeacherLslCatalogEntry[];
    examOpinions: TeacherLslCatalogEntry[];
    schoolEngagements: TeacherLslCatalogEntry[];
    detailedSchoolEngagements: TeacherLslCatalogEntry[];
    notations: TeacherLslNotationEntry[];
  },
): TeacherLslStudent[] {
  const student = asRecord(value);
  const id = asNumber(student?.id);
  if (id === undefined) return [];

  const firstName = asString(student?.prenom) ?? "";
  const lastName = asString(student?.nom) ?? "";
  const particle = asString(student?.particule) ?? "";
  const name = [firstName, particle, lastName].filter(Boolean).join(" ").trim();
  if (!name) return [];

  const subjects = Array.isArray(student?.matieres)
    ? student.matieres.flatMap((subjectEntry) => normalizeStudentSubject(subjectEntry, catalogs))
    : [];
  const mobility = normalizeMobility(student?.mobiliteScolaire);

  return [{
    id,
    name,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(asString(student?.photo) ? { photo: asString(student?.photo) } : {}),
    ...(asString(student?.ordreArrivee) ? { arrivalOrder: asString(student?.ordreArrivee) } : {}),
    ...(asString(student?.sexe) ? { gender: asString(student?.sexe) } : {}),
    ...(asNumber(student?.idClasse) !== undefined ? { classId: asNumber(student?.idClasse) } : {}),
    ...(asString(student?.codeFormation) ? { formationCode: asString(student?.codeFormation) } : {}),
    ...(asString(student?.langueEnseignementTechno) ? { languageTechno: asString(student?.langueEnseignementTechno) } : {}),
    ...(mobility ? { mobility } : {}),
    examOpinions: normalizeAvisArray(student?.avisEleve, catalogs.examOpinions),
    schoolEngagements: normalizeEngagementArray(student?.engagementsEleve, catalogs.schoolEngagements),
    detailedSchoolEngagements: normalizeEngagementArray(student?.engagementsEleveAvecPrecision, catalogs.detailedSchoolEngagements),
    subjects,
    subjectCount: subjects.length,
  }];
}

function normalizeStudentSubject(
  value: unknown,
  catalogs: {
    appreciations: TeacherLslCatalogEntry[];
    examOpinions: TeacherLslCatalogEntry[];
    schoolEngagements: TeacherLslCatalogEntry[];
    detailedSchoolEngagements: TeacherLslCatalogEntry[];
    notations: TeacherLslNotationEntry[];
  },
): TeacherLslStudentSubject[] {
  const subject = asRecord(value);
  const code = asString(subject?.code);
  if (!code) return [];

  return [{
    code,
    ...(asString(subject?.codeInterne) ? { internalCode: asString(subject?.codeInterne) } : {}),
    ...(asString(subject?.libelle) ? { label: asString(subject?.libelle) } : {}),
    ...(asString(subject?.modaliteElection) ? { electionMode: asString(subject?.modaliteElection) } : {}),
    ...(decodeBase64OrPlainText(subject?.appAnnuelle) ? { annualAppreciation: decodeBase64OrPlainText(subject?.appAnnuelle) } : {}),
    ...(asString(subject?.moyenneClasse) ? { classAverage: asString(subject?.moyenneClasse) } : {}),
    ...(asString(subject?.moyennePeriode1) ? { classAveragePeriod1: asString(subject?.moyennePeriode1) } : {}),
    ...(asString(subject?.moyennePeriode2) ? { classAveragePeriod2: asString(subject?.moyennePeriode2) } : {}),
    ...(asString(subject?.moyennePeriode3) ? { classAveragePeriod3: asString(subject?.moyennePeriode3) } : {}),
    ...(asNumber(subject?.inf8) !== undefined ? { lessThan8: asNumber(subject?.inf8) } : {}),
    ...(asNumber(subject?.entre8et12) !== undefined ? { between8And12: asNumber(subject?.entre8et12) } : {}),
    ...(asNumber(subject?.sup12) !== undefined ? { above12: asNumber(subject?.sup12) } : {}),
    ...(asString(subject?.notationDNL) ? { dnlNotation: asString(subject?.notationDNL) } : {}),
    appreciations: normalizeAppreciationEntries(subject?.appreciations, catalogs.appreciations),
    competencies: normalizeCompetencies(subject?.competences, catalogs.notations),
  }];
}

function normalizeAppreciationEntries(
  value: unknown,
  catalog: TeacherLslCatalogEntry[],
): TeacherLslAppreciationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const appreciation = asRecord(entry);
    if (!appreciation) return [];
    const code = asString(appreciation.code);
    const catalogEntry = code ? catalog.find((candidate) => candidate.code === code) : undefined;
    const authorName = joinName(asString(appreciation.prenomAuteur), undefined, asString(appreciation.nomAuteur));
    const text = decodeBase64OrPlainText(appreciation.texte ?? appreciation.contenu ?? appreciation.text);

    const normalized: TeacherLslAppreciationEntry = {
      ...(code ? { code } : {}),
      ...(catalogEntry?.label ? { label: catalogEntry.label } : asString(appreciation.libelle) ? { label: asString(appreciation.libelle) } : {}),
      ...(text ? { text } : {}),
      ...(asString(appreciation.date) ? { date: asString(appreciation.date) } : {}),
      ...(authorName ? { authorName } : {}),
      ...(catalogEntry?.maxCharacters !== undefined ? { maxCharacters: catalogEntry.maxCharacters } : {}),
    };

    return Object.keys(normalized).length > 0 ? [normalized] : [];
  });
}

function normalizeAvisArray(value: unknown, catalog: TeacherLslCatalogEntry[]): TeacherLslAvisEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const avis = asRecord(entry);
    if (!avis) return [];

    const code = asString(avis.code);
    const catalogEntry = code ? catalog.find((candidate) => candidate.code === code) : undefined;
    const authorName = joinName(asString(avis.prenomAuteur), undefined, asString(avis.nomAuteur));
    const text = decodeBase64OrPlainText(avis.texte);

    const normalized: TeacherLslAvisEntry = {
      ...(asString(avis.type) ? { type: asString(avis.type) } : {}),
      ...(code ? { code } : {}),
      ...(catalogEntry?.label ? { label: catalogEntry.label } : {}),
      ...(text ? { text } : {}),
      ...(authorName ? { authorName } : {}),
      ...(asString(avis.date) ? { date: asString(avis.date) } : {}),
      ...(asNumber(avis.nbSemaines) !== undefined ? { weeks: asNumber(avis.nbSemaines) } : {}),
      ...(asBooleanLike(avis.isPartieEffectueeEtranger) !== undefined ? { abroadPartCompleted: asBooleanLike(avis.isPartieEffectueeEtranger) } : {}),
    };

    return Object.keys(normalized).length > 0 ? [normalized] : [];
  });
}

function normalizeEngagementArray(
  value: unknown,
  catalog: TeacherLslCatalogEntry[],
): TeacherLslEngagementEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const engagement = asRecord(entry);
    if (!engagement) return [];

    const code = asString(engagement.code);
    const catalogEntry = code ? catalog.find((candidate) => candidate.code === code) : undefined;

    return [{
      ...(asString(engagement.type) ? { type: asString(engagement.type) } : {}),
      ...(code ? { code } : {}),
      ...(catalogEntry?.label ? { label: catalogEntry.label } : asString(engagement.libelle) ? { label: asString(engagement.libelle) } : {}),
      active: asBooleanLike(engagement.isActif) ?? false,
    }];
  });
}

function normalizeCompetencies(value: unknown, notations: TeacherLslNotationEntry[]): TeacherLslCompetency[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const competence = asRecord(entry);
    if (!competence) return [];

    const evaluationCode = asString(competence.evaluation);
    const evaluationLabel = evaluationCode
      ? notations.find((candidate) => candidate.code === evaluationCode)?.label
      : undefined;

    const normalized: TeacherLslCompetency = {
      ...(asString(competence.code) ? { code: asString(competence.code) } : {}),
      ...(asString(competence.libelle) ? { label: asString(competence.libelle) } : {}),
      ...(evaluationCode ? { evaluationCode } : {}),
      ...(evaluationLabel ? { evaluationLabel } : {}),
      ...(asNumber(competence.ordre) !== undefined ? { order: asNumber(competence.ordre) } : {}),
    };

    return Object.keys(normalized).length > 0 ? [normalized] : [];
  });
}

function normalizeMobility(value: unknown): TeacherLslMobility | undefined {
  const mobility = asRecord(value);
  if (!mobility) return undefined;

  const normalized: TeacherLslMobility = {
    ...(asString(mobility.codePays) ? { countryCode: asString(mobility.codePays) } : {}),
    ...(asString(mobility.libellePays) ? { countryLabel: asString(mobility.libellePays) } : {}),
    ...(asString(mobility.notePresentation) ? { presentationNote: asString(mobility.notePresentation) } : {}),
    ...(asString(mobility.noteTheme) ? { themeNote: asString(mobility.noteTheme) } : {}),
    ...(asString(mobility.noteReflexion) ? { reflectionNote: asString(mobility.noteReflexion) } : {}),
    ...(asString(mobility.titreRapport) ? { reportTitle: asString(mobility.titreRapport) } : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function decodeBase64OrPlainText(value: unknown): string | undefined {
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

function joinName(firstName: string | undefined, particle: string | undefined, lastName: string | undefined): string | undefined {
  const parts = [firstName, particle, lastName].filter((part): part is string => !!part && part.length > 0);
  return parts.length > 0 ? parts.join(" ") : undefined;
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

function asBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1) return true;
  if (value === "0" || value === 0) return false;
  return undefined;
}