import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherAttendanceStudentDevice {
  code?: string;
  label?: string;
}

export interface TeacherAttendanceStudent {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  sexe?: string;
  classId?: number;
  groupId?: number;
  className?: string;
  entryDate?: string;
  exitDate?: string;
  badgeNumber?: string;
  boarderStatus?: string;
  email?: string;
  mobile?: string;
  photo?: string;
  birthDate?: string;
  inStage: boolean;
  apprentice: boolean;
  dispensed: boolean;
  dispensationEnd?: string;
  presenceRequired: boolean;
  absentBefore: boolean;
  devices: TeacherAttendanceStudentDevice[];
}

export interface TeacherAttendanceEntity {
  id: number;
  type?: string;
  code?: string;
  label?: string;
  isFlexible?: boolean;
  isPrimary?: boolean;
}

export interface TeacherAttendanceCallStatus {
  completed: boolean;
  recordedAt?: string;
}

export interface TeacherAttendancePayload {
  students: TeacherAttendanceStudent[];
  entity?: TeacherAttendanceEntity;
  attendanceCall: TeacherAttendanceCallStatus;
  studentCount: number;
}

export interface NormalizedTeacherAttendanceResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherAttendancePayload;
  message?: string;
}

export function normalizeTeacherAttendanceResponse(
  raw: RawApiResponse,
): NormalizedTeacherAttendanceResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const source = asObject(raw.data);
  const studentsSource = Array.isArray(source?.eleves) ? source.eleves : [];
  const students = studentsSource.flatMap((entry) => normalizeAttendanceStudent(entry));
  const entity = normalizeEntity(source?.entity);
  const attendanceCall = normalizeAttendanceCall(source?.appelEnClasse);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      students,
      ...(entity ? { entity } : {}),
      attendanceCall,
      studentCount: students.length,
    },
  };
}

function normalizeAttendanceStudent(entry: unknown): TeacherAttendanceStudent[] {
  const source = asObject(entry);
  if (typeof source?.id !== "number") return [];

  const firstName = typeof source.prenom === "string" ? source.prenom.trim() : "";
  const lastName = typeof source.nom === "string" ? source.nom.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  if (!fullName) return [];

  return [{
    id: source.id,
    name: fullName,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(typeof source.sexe === "string" ? { sexe: source.sexe } : {}),
    ...(typeof source.classeId === "number" ? { classId: source.classeId } : {}),
    ...(typeof source.groupeId === "number" ? { groupId: source.groupeId } : {}),
    ...(typeof source.classeLibelle === "string" ? { className: source.classeLibelle } : {}),
    ...(typeof source.dateEntree === "string" && source.dateEntree ? { entryDate: source.dateEntree } : {}),
    ...(typeof source.dateSortie === "string" && source.dateSortie ? { exitDate: source.dateSortie } : {}),
    ...(typeof source.numeroBadge === "string" && source.numeroBadge ? { badgeNumber: source.numeroBadge } : {}),
    ...(typeof source.regime === "string" && source.regime ? { boarderStatus: source.regime } : {}),
    ...(typeof source.email === "string" && source.email ? { email: source.email } : {}),
    ...(typeof source.portable === "string" && source.portable ? { mobile: source.portable } : {}),
    ...(typeof source.photo === "string" && source.photo ? { photo: source.photo } : {}),
    ...(typeof source.dateNaissance === "string" && source.dateNaissance ? { birthDate: source.dateNaissance } : {}),
    inStage: source.estEnStage === true,
    apprentice: source.estApprenant === true,
    dispensed: source.dispense === true,
    ...(typeof source.finDispense === "string" && source.finDispense ? { dispensationEnd: source.finDispense } : {}),
    presenceRequired: source.presenceObligatoire === true,
    absentBefore: source.absentAvant === true,
    devices: normalizeDevices(source.dispositifs),
  }];
}

function normalizeEntity(entry: unknown): TeacherAttendanceEntity | undefined {
  const source = asObject(entry);
  if (typeof source?.id !== "number") return undefined;

  return {
    id: source.id,
    ...(typeof source.type === "string" ? { type: source.type } : {}),
    ...(typeof source.code === "string" ? { code: source.code } : {}),
    ...(typeof source.libelle === "string" ? { label: source.libelle } : {}),
    ...(typeof source.isFlexible === "boolean" ? { isFlexible: source.isFlexible } : {}),
    ...(typeof source.isPrimaire === "boolean" ? { isPrimary: source.isPrimaire } : {}),
  };
}

function normalizeAttendanceCall(entry: unknown): TeacherAttendanceCallStatus {
  const source = asObject(entry);
  return {
    completed: source?.effectue === true,
    ...(typeof source?.dateHeure === "string" && source.dateHeure ? { recordedAt: source.dateHeure } : {}),
  };
}

function normalizeDevices(value: unknown): TeacherAttendanceStudentDevice[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const source = asObject(entry);
    const code = typeof source?.code === "string" ? source.code : undefined;
    const label = typeof source?.libelle === "string"
      ? source.libelle
      : typeof source?.label === "string"
        ? source.label
        : undefined;
    if (!code && !label) return [];
    return [{ ...(code ? { code } : {}), ...(label ? { label } : {}) }];
  });
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}