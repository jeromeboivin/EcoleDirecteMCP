import { ApiCode, type RawApiResponse } from "./normalize.js";
import type { MessageMailbox } from "./constants.js";

export interface MessageParticipant {
  id?: number;
  role?: string;
  name: string;
  className?: string;
  functionLabel?: string;
  deliveryType?: string;
  read?: boolean;
}

export interface MessageAttachment {
  id?: number;
  name: string;
  type?: string;
  unc?: string;
}

export interface MessageFolder {
  id: number;
  label: string;
  isCustom: boolean;
}

export interface MessagingSettings {
  active?: boolean;
  canParentsReadStudentMessages?: boolean;
  notificationsDisabled?: boolean;
  notifyByEmail?: boolean;
  displayAllClasses?: boolean;
  recipients: {
    admin?: boolean;
    students?: boolean;
    families?: boolean;
    teachers?: boolean;
    workplaces?: boolean;
    enterprises?: boolean;
  };
}

export interface MessagingPagination {
  messagesArchivedCount?: number;
  messagesSentCount?: number;
  messagesReceivedCount?: number;
  messagesUnreadCount?: number;
  messagesDraftCount?: number;
  lastPageLoaded?: Record<string, number>;
}

export interface MessageSummary {
  id: number;
  mailbox: MessageMailbox;
  read: boolean;
  subject: string;
  date?: string;
  draft: boolean;
  transferred: boolean;
  answered: boolean;
  folderId: number;
  dossierId: number;
  responseId?: number;
  forwardId?: number;
  from?: MessageParticipant;
  to: MessageParticipant[];
  attachmentCount: number;
  attachments: MessageAttachment[];
  hasContent: boolean;
}

export interface MessagesPayload {
  folders: MessageFolder[];
  messages: MessageSummary[];
  pagination: MessagingPagination;
  settings: MessagingSettings;
}

export interface NormalizedMessagesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: MessagesPayload;
  message?: string;
}

export function normalizeMessagesResponse(
  raw: RawApiResponse,
  mailbox: MessageMailbox,
): NormalizedMessagesResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  const folders = Array.isArray(data?.classeurs)
    ? data.classeurs.flatMap((folder) => normalizeFolder(folder))
    : [];
  const settings = normalizeSettings(data?.parametrage);
  const pagination = normalizePagination(data?.pagination);
  const messages = extractMessageList(data?.messages, mailbox).flatMap((message) =>
    normalizeMessage(message, mailbox),
  );

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      folders,
      messages,
      pagination,
      settings,
    },
  };
}

function normalizeFolder(value: unknown): MessageFolder[] {
  const folder = asRecord(value);
  const id = asNumber(folder?.id);
  const label = asString(folder?.libelle);
  if (id === undefined || !label) return [];
  return [{ id, label, isCustom: id > 0 }];
}

function normalizeSettings(value: unknown): MessagingSettings {
  const settings = asRecord(value);
  return {
    active: asBooleanLike(settings?.isActif),
    canParentsReadStudentMessages: asBooleanLike(settings?.canParentsLireMessagesEnfants),
    notificationsDisabled: asBooleanLike(settings?.disabledNotification),
    notifyByEmail: asBooleanLike(settings?.notificationEmailEtablissement),
    displayAllClasses: asBooleanLike(settings?.afficherToutesLesClasses),
    recipients: {
      admin: asBooleanLike(settings?.destAdmin),
      students: asBooleanLike(settings?.destEleve),
      families: asBooleanLike(settings?.destFamille),
      teachers: asBooleanLike(settings?.destProf),
      workplaces: asBooleanLike(settings?.destEspTravail),
      enterprises: asBooleanLike(settings?.destEntreprise),
    },
  };
}

function normalizePagination(value: unknown): MessagingPagination {
  const pagination = asRecord(value);
  return {
    ...(asNumber(pagination?.messagesArchivesCount) !== undefined
      ? { messagesArchivedCount: asNumber(pagination?.messagesArchivesCount) }
      : {}),
    ...(asNumber(pagination?.messagesEnvoyesCount) !== undefined
      ? { messagesSentCount: asNumber(pagination?.messagesEnvoyesCount) }
      : {}),
    ...(asNumber(pagination?.messagesRecusCount) !== undefined
      ? { messagesReceivedCount: asNumber(pagination?.messagesRecusCount) }
      : {}),
    ...(asNumber(pagination?.messagesRecusNotReadCount) !== undefined
      ? { messagesUnreadCount: asNumber(pagination?.messagesRecusNotReadCount) }
      : {}),
    ...(asNumber(pagination?.messagesDraftCount) !== undefined
      ? { messagesDraftCount: asNumber(pagination?.messagesDraftCount) }
      : {}),
    ...(asRecord(pagination?.lastPageLoaded)
      ? { lastPageLoaded: normalizeNumberRecord(pagination?.lastPageLoaded) }
      : {}),
  };
}

function extractMessageList(value: unknown, mailbox: MessageMailbox): unknown[] {
  if (Array.isArray(value)) return value;
  const messages = asRecord(value);
  const direct = messages?.[mailbox];
  if (Array.isArray(direct)) return direct;
  if (mailbox === "received" && Array.isArray(messages?.received)) return messages.received;
  if (mailbox === "sent" && Array.isArray(messages?.sent)) return messages.sent;
  if (mailbox === "archived" && Array.isArray(messages?.archived)) return messages.archived;
  if (mailbox === "draft" && Array.isArray(messages?.draft)) return messages.draft;
  return [];
}

function normalizeMessage(value: unknown, mailbox: MessageMailbox): MessageSummary[] {
  const message = asRecord(value);
  const id = asNumber(message?.id);
  if (id === undefined) return [];

  const attachments = Array.isArray(message?.files)
    ? message.files.flatMap((attachment) => normalizeAttachment(attachment))
    : [];

  return [{
    id,
    mailbox,
    read: asBooleanLike(message?.read) ?? false,
    subject: asString(message?.subject) ?? "",
    ...(asString(message?.date) ? { date: asString(message?.date) } : {}),
    draft: asBooleanLike(message?.brouillon) ?? false,
    transferred: asBooleanLike(message?.transferred) ?? false,
    answered: asBooleanLike(message?.answered) ?? false,
    folderId: asNumber(message?.idClasseur) ?? 0,
    dossierId: asNumber(message?.idDossier) ?? 0,
    ...(asNumber(message?.responseId) !== undefined ? { responseId: asNumber(message?.responseId) } : {}),
    ...(asNumber(message?.forwardId) !== undefined ? { forwardId: asNumber(message?.forwardId) } : {}),
    ...(normalizeParticipant(message?.from) ? { from: normalizeParticipant(message?.from) } : {}),
    to: Array.isArray(message?.to)
      ? message.to.flatMap((participant) => {
          const normalized = normalizeParticipant(participant);
          return normalized ? [normalized] : [];
        })
      : [],
    attachmentCount: attachments.length,
    attachments,
    hasContent: hasText(message?.content),
  }];
}

function normalizeParticipant(value: unknown): MessageParticipant | undefined {
  const participant = asRecord(value);
  if (!participant) return undefined;

  const name = [
    asString(participant.civilite),
    asString(participant.prenom),
    asString(participant.particule),
    asString(participant.nom),
  ]
    .filter((part): part is string => !!part && part.length > 0)
    .join(" ")
    .trim();

  if (!name) return undefined;

  return {
    ...(asNumber(participant.id) !== undefined ? { id: asNumber(participant.id) } : {}),
    ...(asString(participant.role) ? { role: asString(participant.role) } : {}),
    name,
    ...(asString(participant.libelleClasse) ? { className: asString(participant.libelleClasse) } : {}),
    ...(asString(participant.fonctionPersonnel) ? { functionLabel: asString(participant.fonctionPersonnel) } : {}),
    ...(asString(participant.to_cc_cci) ? { deliveryType: asString(participant.to_cc_cci) } : {}),
    ...(asBooleanLike(participant.read) !== undefined ? { read: asBooleanLike(participant.read) } : {}),
  };
}

function normalizeAttachment(value: unknown): MessageAttachment[] {
  const attachment = asRecord(value);
  const name = asString(attachment?.libelle) ?? asString(attachment?.displayText);
  if (!name) return [];
  return [{
    ...(asNumber(attachment?.id) !== undefined ? { id: asNumber(attachment?.id) } : {}),
    name,
    ...(asString(attachment?.type) ? { type: asString(attachment?.type) } : {}),
    ...(asString(attachment?.unc) ? { unc: asString(attachment?.unc) } : {}),
  }];
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  const record = asRecord(value);
  if (!record) return {};
  const normalized: Record<string, number> = {};
  for (const [key, entry] of Object.entries(record)) {
    const numeric = asNumber(entry);
    if (numeric !== undefined) normalized[key] = numeric;
  }
  return normalized;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
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