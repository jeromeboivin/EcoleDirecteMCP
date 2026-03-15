import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface TeacherGradebookHomeworkType {
  id?: number;
  code?: string;
  label?: string;
}

export interface TeacherGradebookEvaluation {
  id: number;
  teacherId?: number;
  teacherName?: string;
  label?: string;
  coefficient?: number;
  date?: string;
  displayDate?: string;
  nonSignificant: boolean;
  ccf: boolean;
  maxGrade?: number;
  notationLetter: boolean;
  noteNegative: boolean;
  periodStatus?: string;
  periodId?: string;
  subjectCode?: string;
  subSubjectCode?: string;
  withGrade: boolean;
  comment?: string;
  programElements: unknown[];
  homeworkType?: TeacherGradebookHomeworkType;
}

export interface TeacherGradebookStudent {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  classLabel?: string;
  classCode?: string;
  gender?: string;
  photo?: string;
  arrivalOrder?: string;
  dispositifs: unknown[];
}

export interface TeacherGradebookNoteCell {
  noteId?: number;
  evaluationId: number;
  periodId?: string;
  coefficient?: number;
  grade?: string;
  maxGrade?: number;
  letter?: string;
  notationLetter: boolean;
  date?: string;
  evaluationLabel?: string;
  ccf: boolean;
  nonSignificant: boolean;
  subjectCode?: string;
  subSubjectCode?: string;
  comment?: string;
  programElements: unknown[];
}

export interface TeacherGradebookStudentRow {
  student: TeacherGradebookStudent;
  grades: Record<string, TeacherGradebookNoteCell>;
}

export interface TeacherGradebookNotesPayload {
  evaluations: TeacherGradebookEvaluation[];
  students: TeacherGradebookStudentRow[];
  evaluationCount: number;
  studentCount: number;
}

export interface NormalizedTeacherGradebookNotesResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherGradebookNotesPayload;
  message?: string;
}

export function normalizeTeacherGradebookNotesResponse(
  raw: RawApiResponse,
): NormalizedTeacherGradebookNotesResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = raw.data as Record<string, unknown> | undefined;
  const evaluations = normalizeEvaluations(data?.devoirs);
  const students = normalizeStudentRows(data?.eleves);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      evaluations,
      students,
      evaluationCount: evaluations.length,
      studentCount: students.length,
    },
  };
}

function normalizeEvaluations(value: unknown): TeacherGradebookEvaluation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const evaluation = entry as Record<string, unknown>;
    if (typeof evaluation.id !== "number") return [];

    return [{
      id: evaluation.id,
      ...(typeof evaluation.idProf === "number" ? { teacherId: evaluation.idProf } : {}),
      ...(typeof evaluation.nomProf === "string" && evaluation.nomProf.trim() ? { teacherName: evaluation.nomProf.trim() } : {}),
      ...(typeof evaluation.libelle === "string" && evaluation.libelle.trim() ? { label: evaluation.libelle.trim() } : {}),
      ...(typeof evaluation.coef === "number" ? { coefficient: evaluation.coef } : {}),
      ...(typeof evaluation.date === "string" ? { date: evaluation.date } : {}),
      ...(typeof evaluation.dateAffichage === "string" ? { displayDate: evaluation.dateAffichage } : {}),
      nonSignificant: evaluation.nonSignificatif === true,
      ccf: evaluation.ccf === true,
      ...(typeof evaluation.noteSur === "number" ? { maxGrade: evaluation.noteSur } : {}),
      notationLetter: evaluation.notationLettre === true,
      noteNegative: evaluation.noteNegative === true,
      ...(typeof evaluation.statutPeriode === "string" ? { periodStatus: evaluation.statutPeriode } : {}),
      ...(typeof evaluation.idPeriode === "string" ? { periodId: evaluation.idPeriode } : {}),
      ...(typeof evaluation.codeMatiere === "string" ? { subjectCode: evaluation.codeMatiere } : {}),
      ...(typeof evaluation.codeSSMatiere === "string" && evaluation.codeSSMatiere ? { subSubjectCode: evaluation.codeSSMatiere } : {}),
      withGrade: evaluation.avecNote === true,
      ...(typeof evaluation.commentaire === "string" && evaluation.commentaire ? { comment: evaluation.commentaire } : {}),
      programElements: normalizeUnknownArray(evaluation.elementsProgramme),
      ...(normalizeHomeworkType(evaluation.typeDevoir) ? { homeworkType: normalizeHomeworkType(evaluation.typeDevoir)! } : {}),
    }];
  });
}

function normalizeHomeworkType(value: unknown): TeacherGradebookHomeworkType | undefined {
  const type = value as Record<string, unknown> | undefined;
  if (!type || Object.keys(type).length === 0) return undefined;

  return {
    ...(typeof type.id === "number" ? { id: type.id } : {}),
    ...(typeof type.code === "string" ? { code: type.code } : {}),
    ...(typeof type.libelle === "string" ? { label: type.libelle } : {}),
  };
}

function normalizeStudentRows(value: unknown): TeacherGradebookStudentRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = entry as Record<string, unknown>;
    const student = normalizeStudent(row.eleve);
    if (!student) return [];

    return [{
      student,
      grades: normalizeGrades(row.devoirs),
    }];
  });
}

function normalizeStudent(value: unknown): TeacherGradebookStudent | undefined {
  const student = value as Record<string, unknown> | undefined;
  if (!student || typeof student.id !== "number") return undefined;

  const firstName = typeof student.prenom === "string" ? student.prenom.trim() : "";
  const lastName = typeof student.nom === "string" ? student.nom.trim() : "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || `student ${student.id}`;

  return {
    id: student.id,
    name,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(typeof student.classeLibelle === "string" ? { classLabel: student.classeLibelle } : {}),
    ...(typeof student.codeClasse === "string" ? { classCode: student.codeClasse } : {}),
    ...(typeof student.sexe === "string" ? { gender: student.sexe } : {}),
    ...(typeof student.photo === "string" ? { photo: student.photo } : {}),
    ...(typeof student.ordreArrivee === "string" ? { arrivalOrder: student.ordreArrivee } : {}),
    dispositifs: normalizeUnknownArray(student.dispositifs),
  };
}

function normalizeGrades(value: unknown): Record<string, TeacherGradebookNoteCell> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const cells: Record<string, TeacherGradebookNoteCell> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const cell = normalizeGradeCell(entry, key);
    if (!cell) continue;
    cells[key] = cell;
  }
  return cells;
}

function normalizeGradeCell(value: unknown, fallbackKey: string): TeacherGradebookNoteCell | undefined {
  const cell = value as Record<string, unknown> | undefined;
  if (!cell) return undefined;

  const evaluationId = typeof cell.idDevoir === "number"
    ? cell.idDevoir
    : Number.parseInt(fallbackKey, 10);
  if (!Number.isFinite(evaluationId)) return undefined;

  return {
    ...(typeof cell.idNote === "number" ? { noteId: cell.idNote } : {}),
    evaluationId,
    ...(typeof cell.idPeriode === "string" ? { periodId: cell.idPeriode } : {}),
    ...(typeof cell.coef === "number" ? { coefficient: cell.coef } : {}),
    ...(typeof cell.note === "string" ? { grade: cell.note } : {}),
    ...(typeof cell.noteSur === "number" ? { maxGrade: cell.noteSur } : {}),
    ...(typeof cell.lettre === "string" && cell.lettre ? { letter: cell.lettre } : {}),
    notationLetter: cell.notationLettre === true,
    ...(typeof cell.date === "string" ? { date: cell.date } : {}),
    ...(typeof cell.devoirLibelle === "string" && cell.devoirLibelle.trim() ? { evaluationLabel: cell.devoirLibelle.trim() } : {}),
    ccf: cell.ccf === true,
    nonSignificant: cell.nonSignificatif === true,
    ...(typeof cell.codeMatiere === "string" ? { subjectCode: cell.codeMatiere } : {}),
    ...(typeof cell.codeSSMatiere === "string" && cell.codeSSMatiere ? { subSubjectCode: cell.codeSSMatiere } : {}),
    ...(typeof cell.commentaire === "string" && cell.commentaire ? { comment: cell.commentaire } : {}),
    programElements: normalizeUnknownArray(cell.elementsProgramme),
  };
}

function normalizeUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}