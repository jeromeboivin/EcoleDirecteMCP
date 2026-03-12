import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface EmploiDuTempsEvent {
  id: number;
  label: string;
  subject: string;
  subjectCode?: string;
  courseType?: string;
  startDate: string;
  endDate: string;
  color?: string;
  dispensable: boolean;
  dispensed: boolean;
  teacher?: string;
  room?: string;
  className?: string;
  classId?: number;
  classCode?: string;
  eventId?: number;
  groupName?: string;
  groupCode?: string;
  flexible: boolean;
  groupId?: number;
  icon?: string;
  modified: boolean;
  hasLessonContent: boolean;
  hasHomework: boolean;
  cancelled: boolean;
}

export interface EmploiDuTempsDay {
  date: string;
  events: EmploiDuTempsEvent[];
}

export interface EmploiDuTempsPayload {
  days: EmploiDuTempsDay[];
  totalEvents: number;
}

export interface NormalizedEmploiDuTempsResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: EmploiDuTempsPayload;
  message?: string;
}

export function normalizeEmploiDuTempsResponse(raw: RawApiResponse): NormalizedEmploiDuTempsResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const source = Array.isArray(raw.data) ? raw.data : [];
  const events = source.flatMap((entry) => normalizeEvent(entry));
  const daysByDate = new Map<string, EmploiDuTempsEvent[]>();

  for (const event of events) {
    const date = event.startDate.slice(0, 10);
    const day = daysByDate.get(date);
    if (day) {
      day.push(event);
    } else {
      daysByDate.set(date, [event]);
    }
  }

  const days = [...daysByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayEvents]) => ({
      date,
      events: dayEvents.sort((left, right) => left.startDate.localeCompare(right.startDate)),
    }));

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      days,
      totalEvents: events.length,
    },
  };
}

function normalizeEvent(value: unknown): EmploiDuTempsEvent[] {
  const event = asRecord(value);
  const id = asNumber(event?.id);
  const label = asString(event?.text);
  const subject = asString(event?.matiere);
  const startDate = asString(event?.start_date);
  const endDate = asString(event?.end_date);
  if (id === undefined || !label || !subject || !startDate || !endDate) return [];

  return [{
    id,
    label,
    subject,
    ...(asString(event?.codeMatiere) ? { subjectCode: asString(event?.codeMatiere) } : {}),
    ...(asString(event?.typeCours) ? { courseType: asString(event?.typeCours) } : {}),
    startDate,
    endDate,
    ...(asString(event?.color) ? { color: asString(event?.color) } : {}),
    dispensable: asBooleanLike(event?.dispensable) ?? false,
    dispensed: asBooleanLike(event?.dispense) ?? false,
    ...(asString(event?.prof) ? { teacher: asString(event?.prof) } : {}),
    ...(asString(event?.salle) ? { room: asString(event?.salle) } : {}),
    ...(asString(event?.classe) ? { className: asString(event?.classe) } : {}),
    ...(asNumber(event?.classeId) !== undefined ? { classId: asNumber(event?.classeId) } : {}),
    ...(asString(event?.classeCode) ? { classCode: asString(event?.classeCode) } : {}),
    ...(asNumber(event?.evenementId) !== undefined ? { eventId: asNumber(event?.evenementId) } : {}),
    ...(asString(event?.groupe) ? { groupName: asString(event?.groupe) } : {}),
    ...(asString(event?.groupeCode) ? { groupCode: asString(event?.groupeCode) } : {}),
    flexible: asBooleanLike(event?.isFlexible) ?? false,
    ...(asNumber(event?.groupeId) !== undefined ? { groupId: asNumber(event?.groupeId) } : {}),
    ...(asString(event?.icone) ? { icon: asString(event?.icone) } : {}),
    modified: asBooleanLike(event?.isModifie) ?? false,
    hasLessonContent: asBooleanLike(event?.contenuDeSeance) ?? false,
    hasHomework: asBooleanLike(event?.devoirAFaire) ?? false,
    cancelled: asBooleanLike(event?.isAnnule) ?? false,
  }];
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