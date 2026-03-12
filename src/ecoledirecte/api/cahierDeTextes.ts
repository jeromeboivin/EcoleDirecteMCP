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

export interface NormalizedCahierDeTextesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: CahierDeTextesPayload;
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