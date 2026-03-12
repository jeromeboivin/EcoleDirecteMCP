import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface CahierDeTextesAssignment {
  homeworkId?: number;
  subject: string;
  subjectCode?: string;
  dueDate: string;
  assignedOn?: string;
  toDo: boolean;
  documentsToDo: boolean;
  completed: boolean;
  interrogation: boolean;
  onlineSubmission: boolean;
  tags: string[];
}

export interface CahierDeTextesDay {
  date: string;
  assignments: CahierDeTextesAssignment[];
}

export interface CahierDeTextesPayload {
  days: CahierDeTextesDay[];
  totalAssignments: number;
}

export interface CahierDeTextesDayLessonContent {
  lessonId?: number;
  html?: string;
  documents: Array<Record<string, unknown>>;
  curriculumElements: Array<Record<string, unknown>>;
  manualLinks: Array<Record<string, unknown>>;
}

export interface CahierDeTextesDayHomeworkDetail {
  homeworkId: number;
  html?: string;
  onlineSubmission: boolean;
  assignedOn?: string;
  completed: boolean;
  resource?: string;
  submittedDocumentsUploaded: boolean;
  resourceDocuments: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  curriculumElements: Array<Record<string, unknown>>;
  manualLinks: Array<Record<string, unknown>>;
  submittedDocuments: Array<Record<string, unknown>>;
  tags: string[];
  personalizedAssignments: Array<Record<string, unknown>>;
}

export interface CahierDeTextesDaySubject {
  entityCode?: string;
  entityLabel?: string;
  entityType?: string;
  subject: string;
  subjectCode?: string;
  teacher?: string;
  homeworkId: number;
  interrogation: boolean;
  blogActive: boolean;
  maxSubmissionDays: number;
  homework?: CahierDeTextesDayHomeworkDetail;
  lessonContent?: CahierDeTextesDayLessonContent;
}

export interface CahierDeTextesDayDetailPayload {
  date: string;
  subjects: CahierDeTextesDaySubject[];
  homeworkCount: number;
  lessonContentCount: number;
}

export interface NormalizedCahierDeTextesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: CahierDeTextesPayload;
  message?: string;
}

export interface NormalizedCahierDeTextesDayResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: CahierDeTextesDayDetailPayload;
  message?: string;
}

export function normalizeCahierDeTextesResponse(raw: RawApiResponse): NormalizedCahierDeTextesResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data) ?? {};
  const days = Object.entries(data)
    .filter(([, value]) => Array.isArray(value))
    .map(([date, value]) => ({
      date,
      assignments: (value as unknown[]).flatMap((assignment) => normalizeAssignment(assignment, date)),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      days,
      totalAssignments: days.reduce((sum, day) => sum + day.assignments.length, 0),
    },
  };
}

export function normalizeCahierDeTextesDayResponse(raw: RawApiResponse): NormalizedCahierDeTextesDayResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  const date = asString(data?.date);
  const subjects = Array.isArray(data?.matieres)
    ? data.matieres.flatMap((subject) => normalizeDaySubject(subject))
    : [];

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      date: date ?? "",
      subjects,
      homeworkCount: subjects.filter((subject) => subject.homework !== undefined).length,
      lessonContentCount: subjects.filter((subject) => subject.lessonContent !== undefined).length,
    },
  };
}

function normalizeAssignment(value: unknown, dueDate: string): CahierDeTextesAssignment[] {
  const assignment = asRecord(value);
  const subject = asString(assignment?.matiere);
  if (!subject) return [];

  return [{
    ...(asNumber(assignment?.idDevoir) !== undefined ? { homeworkId: asNumber(assignment?.idDevoir) } : {}),
    subject,
    ...(asString(assignment?.codeMatiere) ? { subjectCode: asString(assignment?.codeMatiere) } : {}),
    dueDate,
    ...(asString(assignment?.donneLe) ? { assignedOn: asString(assignment?.donneLe) } : {}),
    toDo: asBooleanLike(assignment?.aFaire) ?? false,
    documentsToDo: asBooleanLike(assignment?.documentsAFaire) ?? false,
    completed: asBooleanLike(assignment?.effectue) ?? false,
    interrogation: asBooleanLike(assignment?.interrogation) ?? false,
    onlineSubmission: asBooleanLike(assignment?.rendreEnLigne) ?? false,
    tags: normalizeTags(assignment?.tags),
  }];
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((tag) => {
    if (typeof tag === "string" && tag.length > 0) return [tag];
    const record = asRecord(tag);
    const label = asString(record?.libelle) ?? asString(record?.label) ?? asString(record?.code);
    return label ? [label] : [];
  });
}

function normalizeDaySubject(value: unknown): CahierDeTextesDaySubject[] {
  const subject = asRecord(value);
  const subjectName = asString(subject?.matiere);
  const homeworkId = asNumber(subject?.id);
  if (!subjectName || homeworkId === undefined) return [];

  const lessonContent = normalizeLessonContent(subject?.contenuDeSeance);
  const homework = normalizeHomeworkDetail(subject?.aFaire);

  return [{
    ...(asString(subject?.entityCode) ? { entityCode: asString(subject?.entityCode) } : {}),
    ...(asString(subject?.entityLibelle) ? { entityLabel: asString(subject?.entityLibelle) } : {}),
    ...(asString(subject?.entityType) ? { entityType: asString(subject?.entityType) } : {}),
    subject: subjectName,
    ...(asString(subject?.codeMatiere) ? { subjectCode: asString(subject?.codeMatiere) } : {}),
    ...(asString(subject?.nomProf) ? { teacher: asString(subject?.nomProf) } : {}),
    homeworkId,
    interrogation: asBooleanLike(subject?.interrogation) ?? false,
    blogActive: asBooleanLike(subject?.blogActif) ?? false,
    maxSubmissionDays: asNumber(subject?.nbJourMaxRenduDevoir) ?? 0,
    ...(homework ? { homework } : {}),
    ...(lessonContent ? { lessonContent } : {}),
  }];
}

function normalizeHomeworkDetail(value: unknown): CahierDeTextesDayHomeworkDetail | undefined {
  const homework = asRecord(value);
  const homeworkId = asNumber(homework?.idDevoir);
  if (homeworkId === undefined) return undefined;

  return {
    homeworkId,
    ...(decodeBase64ToUtf8(asString(homework?.contenu)) ? { html: decodeBase64ToUtf8(asString(homework?.contenu)) } : {}),
    onlineSubmission: asBooleanLike(homework?.rendreEnLigne) ?? false,
    ...(asString(homework?.donneLe) ? { assignedOn: asString(homework?.donneLe) } : {}),
    completed: asBooleanLike(homework?.effectue) ?? false,
    ...(asString(homework?.ressource) ? { resource: asString(homework?.ressource) } : {}),
    submittedDocumentsUploaded: asBooleanLike(homework?.documentsRendusDeposes) ?? false,
    resourceDocuments: normalizeRecordArray(homework?.ressourceDocuments),
    documents: normalizeRecordArray(homework?.documents),
    curriculumElements: normalizeRecordArray(homework?.elementsProg),
    manualLinks: normalizeRecordArray(homework?.liensManuel),
    submittedDocuments: normalizeRecordArray(homework?.documentsRendus),
    tags: normalizeTags(homework?.tags),
    personalizedAssignments: normalizeRecordArray(homework?.cdtPersonnalises),
  };
}

function normalizeLessonContent(value: unknown): CahierDeTextesDayLessonContent | undefined {
  const content = asRecord(value);
  if (!content) return undefined;

  const lessonId = asNumber(content?.idDevoir);
  const html = decodeBase64ToUtf8(asString(content?.contenu));
  const documents = normalizeRecordArray(content?.documents);
  const curriculumElements = normalizeRecordArray(content?.elementsProg);
  const manualLinks = normalizeRecordArray(content?.liensManuel);

  if (lessonId === undefined && html === undefined && documents.length === 0 && curriculumElements.length === 0 && manualLinks.length === 0) {
    return undefined;
  }

  return {
    ...(lessonId !== undefined ? { lessonId } : {}),
    ...(html ? { html } : {}),
    documents,
    curriculumElements,
    manualLinks,
  };
}

function normalizeRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    return record ? [record] : [];
  });
}

function decodeBase64ToUtf8(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8").trim();
    return decoded.length > 0 ? decoded : undefined;
  } catch {
    return undefined;
  }
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