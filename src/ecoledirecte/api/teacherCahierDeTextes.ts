import type { CahierDeTextesAttachment } from "./cahierDeTextes.js";
import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherCahierDeTextesLessonContent {
  lessonId?: number;
  html?: string;
  documents: CahierDeTextesAttachment[];
  curriculumElements: Array<Record<string, unknown>>;
  manualLinks: Array<Record<string, unknown>>;
}

export interface TeacherCahierDeTextesHomeworkDetail {
  homeworkId?: number;
  html?: string;
  onlineSubmission: boolean;
  assignedOn?: string;
  completed: boolean;
  resourceDocuments: CahierDeTextesAttachment[];
  documents: CahierDeTextesAttachment[];
  curriculumElements: Array<Record<string, unknown>>;
  manualLinks: Array<Record<string, unknown>>;
  submittedDocuments: CahierDeTextesAttachment[];
  tags: string[];
}

export interface TeacherCahierDeTextesSlot {
  courseId?: number;
  cahierId?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  entityId?: number;
  entityCode?: string;
  entityLabel?: string;
  entityType?: string;
  room?: string;
  subjectCode?: string;
  subjectLabel?: string;
  interrogation: boolean;
  hasHomework: boolean;
  hasLessonContent: boolean;
  homework?: TeacherCahierDeTextesHomeworkDetail;
  lessonContent?: TeacherCahierDeTextesLessonContent;
}

export interface TeacherCahierDeTextesPayload {
  slots: TeacherCahierDeTextesSlot[];
  slotCount: number;
  homeworkCount: number;
  lessonContentCount: number;
}

export interface NormalizedTeacherCahierDeTextesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherCahierDeTextesPayload;
  message?: string;
}

export function normalizeTeacherCahierDeTextesResponse(
  raw: RawApiResponse,
): NormalizedTeacherCahierDeTextesResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const source = Array.isArray(raw.data) ? raw.data : [];
  const slots = source.flatMap((entry) => normalizeSlot(entry)).sort(compareSlots);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      slots,
      slotCount: slots.length,
      homeworkCount: slots.filter((slot) => slot.hasHomework).length,
      lessonContentCount: slots.filter((slot) => slot.hasLessonContent).length,
    },
  };
}

function normalizeSlot(value: unknown): TeacherCahierDeTextesSlot[] {
  const slot = asRecord(value);
  if (!slot) return [];

  const homework = normalizeHomework(slot.aFaire);
  const lessonContent = normalizeLessonContent(slot.seance ?? slot.contenuDeSeance);
  const hasHomework = homework !== undefined || (asBooleanLike(slot.travailAFaire) ?? false);
  const hasLessonContent = lessonContent !== undefined || (asBooleanLike(slot.contenuDeSeance) ?? false);

  return [{
    ...(asNumber(slot.idCours) !== undefined ? { courseId: asNumber(slot.idCours) } : {}),
    ...(asNumber(slot.idCDT) !== undefined ? { cahierId: asNumber(slot.idCDT) } : {}),
    ...(asString(slot.date) ? { date: asString(slot.date) } : {}),
    ...(asString(slot.start_date) ? { startDate: asString(slot.start_date) } : {}),
    ...(asString(slot.end_date) ? { endDate: asString(slot.end_date) } : {}),
    ...(asNumber(slot.entityId) !== undefined ? { entityId: asNumber(slot.entityId) } : {}),
    ...(asString(slot.entityCode) ? { entityCode: asString(slot.entityCode) } : {}),
    ...(asString(slot.entityLibelle) ? { entityLabel: asString(slot.entityLibelle) } : {}),
    ...(asString(slot.entityType) ? { entityType: asString(slot.entityType) } : {}),
    ...(asString(slot.salle) ? { room: asString(slot.salle) } : {}),
    ...(asString(slot.matiereCode) ? { subjectCode: asString(slot.matiereCode) } : {}),
    ...(asString(slot.matiereLibelle) ? { subjectLabel: asString(slot.matiereLibelle) } : {}),
    interrogation: asBooleanLike(slot.interrogation) ?? false,
    hasHomework,
    hasLessonContent,
    ...(homework ? { homework } : {}),
    ...(lessonContent ? { lessonContent } : {}),
  }];
}

function normalizeHomework(value: unknown): TeacherCahierDeTextesHomeworkDetail | undefined {
  const homework = asRecord(value);
  if (!homework) return undefined;

  const html = decodeBase64ToUtf8(asString(homework.contenu));
  const documents = normalizeAttachmentArray(homework.documents);
  const resourceDocuments = normalizeAttachmentArray(homework.ressourceDocuments);
  const submittedDocuments = normalizeAttachmentArray(homework.documentsRendus);
  const curriculumElements = normalizeRecordArray(homework.elementsProg);
  const manualLinks = normalizeRecordArray(homework.liensManuel);
  const tags = normalizeTags(homework.tags);
  const homeworkId = asNumber(homework.idDevoir);

  if (
    homeworkId === undefined
    && html === undefined
    && documents.length === 0
    && resourceDocuments.length === 0
    && submittedDocuments.length === 0
    && curriculumElements.length === 0
    && manualLinks.length === 0
    && tags.length === 0
  ) {
    return undefined;
  }

  return {
    ...(homeworkId !== undefined ? { homeworkId } : {}),
    ...(html ? { html } : {}),
    onlineSubmission: asBooleanLike(homework.rendreEnLigne) ?? false,
    ...(asString(homework.donneLe) ? { assignedOn: asString(homework.donneLe) } : {}),
    completed: asBooleanLike(homework.effectue) ?? false,
    resourceDocuments,
    documents,
    curriculumElements,
    manualLinks,
    submittedDocuments,
    tags,
  };
}

function normalizeLessonContent(value: unknown): TeacherCahierDeTextesLessonContent | undefined {
  const content = asRecord(value);
  if (!content) return undefined;

  const lessonId = asNumber(content.idDevoir);
  const html = decodeBase64ToUtf8(asString(content.contenu));
  const documents = normalizeAttachmentArray(content.documents);
  const curriculumElements = normalizeRecordArray(content.elementsProg);
  const manualLinks = normalizeRecordArray(content.liensManuel);

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

function normalizeAttachmentArray(value: unknown): CahierDeTextesAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => normalizeAttachment(entry));
}

function normalizeAttachment(value: unknown): CahierDeTextesAttachment[] {
  const attachment = asRecord(value);
  if (!attachment) return [];

  const id = asNumber(attachment.id)
    ?? asNumber(attachment.fichierId)
    ?? asNumber(attachment.idFichier)
    ?? asNumber(attachment.fileId);
  const downloadId = asString(attachment.fichierId)
    ?? asString(attachment.idFichier)
    ?? asString(attachment.fileId)
    ?? asString(attachment.downloadId)
    ?? (id !== undefined ? String(id) : undefined);
  const url = normalizeAttachmentUrl(
    asString(attachment.urlFichier)
      ?? asString(attachment.url)
      ?? asString(attachment.href)
      ?? asString(attachment.lien),
  );
  const name = asString(attachment.libelle)
    ?? asString(attachment.displayText)
    ?? asString(attachment.nom)
    ?? asString(attachment.name)
    ?? asString(attachment.fileName)
    ?? asString(attachment.filename)
    ?? inferNameFromUrl(url);
  const type = asString(attachment.leTypeDeFichier)
    ?? asString(attachment.typeFichier)
    ?? asString(attachment.type)
    ?? asString(attachment.fileType)
    ?? asString(attachment.categorie);
  const unc = asString(attachment.unc);
  const cToken = asString(attachment.cToken) ?? asString(attachment.ctoken);
  const mimeType = asString(attachment.mimeType) ?? asString(attachment.contentType);
  const extension = asString(attachment.extension);
  const size = asNumber(attachment.taille) ?? asNumber(attachment.size) ?? asNumber(attachment.poids);

  if (
    id === undefined
    && downloadId === undefined
    && name === undefined
    && type === undefined
    && url === undefined
    && unc === undefined
    && cToken === undefined
    && mimeType === undefined
    && extension === undefined
    && size === undefined
  ) {
    return [];
  }

  return [{
    ...(id !== undefined ? { id } : {}),
    ...(downloadId ? { downloadId } : {}),
    ...(name ? { name } : {}),
    ...(type ? { type } : {}),
    ...(url ? { url } : {}),
    ...(unc ? { unc } : {}),
    ...(cToken ? { cToken } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(extension ? { extension } : {}),
    ...(size !== undefined ? { size } : {}),
  }];
}

function normalizeRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    return record ? [record] : [];
  });
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

function normalizeAttachmentUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://api.ecoledirecte.com${value}`;
  return value;
}

function inferNameFromUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://api.ecoledirecte.com");
    const segment = url.pathname.split("/").filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : undefined;
  } catch {
    return undefined;
  }
}

function decodeBase64ToUtf8(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const normalized = value.replace(/\s+/g, "");
  if (normalized.length === 0 || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    return value;
  }

  try {
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch {
    return value;
  }
}

function compareSlots(left: TeacherCahierDeTextesSlot, right: TeacherCahierDeTextesSlot): number {
  const leftDate = left.startDate ?? left.date ?? "";
  const rightDate = right.startDate ?? right.date ?? "";
  const dateComparison = leftDate.localeCompare(rightDate);
  if (dateComparison !== 0) return dateComparison;

  const leftLabel = left.entityLabel ?? left.subjectLabel ?? "";
  const rightLabel = right.entityLabel ?? right.subjectLabel ?? "";
  return leftLabel.localeCompare(rightLabel, "fr", { sensitivity: "base" });
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