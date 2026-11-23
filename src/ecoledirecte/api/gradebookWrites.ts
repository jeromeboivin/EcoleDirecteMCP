import { z } from "zod";
import { teacherGradebookSubjectSegment } from "./constants.js";

const id = z.number().int().positive().safe();
const date = z.string().date();
const subject = z.string().trim().min(1).max(120).regex(/^[^¤\x00-\x1f\x7f]+$/);
const positiveAmount = z.number().positive().max(1_000_000);
const decimal = z.string().trim().regex(/^-?\d{1,6}(?:[.,]\d{1,2})?$/).transform((value) =>
  Number(value.replace(",", ".")).toFixed(2),
);

const target = z.object({
  entityType: z.enum(["C", "G"]),
  entityId: id,
  periodCode: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
  subjectCode: subject,
  subSubjectCode: subject.optional(),
}).strict();

export const createGradebookEvaluationSchema = z.object({
  kind: z.literal("create_gradebook_evaluation"), accountId: id, target,
  label: z.string().trim().min(1).max(120), date, maxGrade: positiveAmount, coefficient: positiveAmount,
  homeworkTypeId: id.optional().describe("ÉcoleDirecte evaluation type, required if the school mandates it"),
  publication: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("school_policy") }).strict(),
    z.object({ mode: z.literal("date"), date }).strict(),
  ]).describe("School policy may publish the evaluation immediately; an explicit date only works if the school allows it"),
}).strict();

export const saveGradebookNotesSchema = z.object({
  kind: z.literal("save_gradebook_notes"), accountId: id, target,
  evaluationId: id, evaluationLabel: z.string().trim().min(1).max(250), maxGrade: positiveAmount,
  displayDate: date.nullable().describe("Current displayDate from the grade grid (null if unknown; changes may be visible immediately)"),
  grades: z.array(z.object({
    studentId: id,
    previousGrade: decimal.nullable().describe("The last observed numeric grade; null means no numeric grade yet, not an absence or other status"),
    grade: decimal.describe("New numeric grade, as a string with at most two decimal places"),
  }).strict()).min(1).max(200),
}).strict();

export type CreateGradebookEvaluation = z.infer<typeof createGradebookEvaluationSchema>;
export type SaveGradebookNotes = z.infer<typeof saveGradebookNotesSchema>;
export type GradebookWrite = CreateGradebookEvaluation | SaveGradebookNotes;
type Target = z.infer<typeof target>;
type RecordData = Record<string, unknown>;

export function validateGradebookPlan(operation: GradebookWrite): void {
  if (operation.target.periodCode === "A999Z") throw new Error("Select a specific grading period, not the aggregate school year.");
  if (operation.kind !== "save_gradebook_notes") return;
  const ids = new Set<number>();
  for (const { studentId, grade, previousGrade } of operation.grades) {
    if (ids.has(studentId)) throw new Error("Duplicate student IDs are not allowed.");
    if (grade === previousGrade) throw new Error("Each change must specify a new grade different from the previous grade.");
    if (Number(grade) > operation.maxGrade) throw new Error("A grade exceeds the evaluation scale.");
    ids.add(studentId);
  }
}

/** Use the raw catalog because the read tool flattens sub-subjects and drops school settings. */
export function selectGradebookCreationTarget(raw: unknown, operation: CreateGradebookEvaluation): number {
  const scope = asRecord(raw);
  const schools = records(Array.isArray(raw) ? raw : scope?.etablissements);
  const candidates: { schoolId: unknown; entity: RecordData }[] = [];
  const { target } = operation;
  for (const school of schools) {
    for (const level of records(school.niveaux)) {
      for (const entity of records(target.entityType === "C" ? level.classes : level.groupes)) {
        candidates.push({ schoolId: school.id, entity });
      }
    }
  }
  if (target.entityType === "G") {
    for (const entity of [...records(scope?.groupes), ...records(scope?.autresGroupes)]) {
      candidates.push({ schoolId: entity.etabId, entity });
    }
  }
  const matches = candidates.filter(({ entity }) => (entity.typeEntity === undefined || entity.typeEntity === target.entityType)
    && (isId(entity.id) ? entity.id : entity.idGroupe) === target.entityId);
  const match = matches.length === 1 ? matches[0] : undefined;
  if (!match || !isId(match.schoolId) || (match.entity.etabId != null && match.entity.etabId !== match.schoolId)
    || (match.entity.estNote != null && match.entity.estNote !== true && (readNumber(match.entity.estNote) ?? 0) <= 0)) {
    throw new Error("The grading class/group or its establishment is missing, ambiguous or not graded.");
  }
  const periods = records(match.entity.periodes).filter((period) => period.codePeriode === target.periodCode);
  const period = periods.length === 1 ? periods[0] : undefined;
  if (!period || period.etat !== "ouvert") throw new Error("The grading period is not confirmed open.");
  const start = readGradebookDate(period.dateDebut);
  const end = readGradebookDate(period.dateFin);
  if (!start || !end || operation.date < start || operation.date > end) {
    throw new Error("The evaluation date is outside the grading period or its bounds are unknown.");
  }

  const segment = teacherGradebookSubjectSegment(target.subjectCode, target.subSubjectCode);
  const subjects = records(period.matieres).filter((entry) => typeof entry.code === "string"
    && teacherGradebookSubjectSegment(entry.code, typeof entry.codeSSMatiere === "string" ? entry.codeSSMatiere : undefined) === segment);
  const selected = subjects.length === 1 ? subjects[0] : undefined;
  if (!selected || selected.code !== target.subjectCode || (selected.codeSSMatiere ?? "") !== (target.subSubjectCode ?? "")
    || selected.avecNotation !== true || selected.avecSousMatiere === 1 || selected.avecSousMatiere === true
    || selected.avecSousMatiere === "1" || selected.isEditable === false
    || (typeof selected.isEditable === "string" && selected.isEditable.trim().toLowerCase() === "jamais")) {
    throw new Error("The subject is missing, ambiguous or not editable for numeric grading. Select the sub-subject when required.");
  }
  return match.schoolId;
}

export function createGradebookPayload(operation: CreateGradebookEvaluation, settings: unknown, schoolId: number): RecordData {
  const schools = records(asRecord(asRecord(settings)?.note)?.etabsParams).filter((school) => school.id === schoolId);
  const school = schools.length === 1 ? schools[0] : undefined;
  if (!school || typeof school.borneMax !== "number" || school.borneMax <= 0) {
    throw new Error("The establishment's grading settings could not be verified.");
  }
  const homeworkTypes = records(school.typesDevoirs).filter((type) => type.id === operation.homeworkTypeId);
  const homeworkType = operation.homeworkTypeId !== undefined && homeworkTypes.length === 1 ? homeworkTypes[0] : undefined;
  if (!homeworkType && (operation.homeworkTypeId !== undefined || school.isTypeDevoirObligatoire === true)) {
    throw new Error("A valid evaluation type for this establishment is required.");
  }
  if (school.isBorneModifiable !== true && school.borneMax !== operation.maxGrade) {
    throw new Error("The establishment does not allow changing the evaluation scale.");
  }
  const defaultCoefficient = typeof homeworkType?.coef === "number" && homeworkType.coef > 0 ? homeworkType.coef : 1;
  if (school.isCoefModifiable !== true && operation.coefficient !== defaultCoefficient) {
    throw new Error("The establishment does not allow changing the evaluation coefficient.");
  }
  const publicationMode = school.avecDecalage;
  if ((operation.publication.mode === "date" && publicationMode !== "2")
    || (operation.publication.mode === "school_policy" && publicationMode !== "0" && publicationMode !== "1")) {
    throw new Error("The selected publication mode does not match the establishment's settings.");
  }

  return { devoir: {
    libelle: operation.label, date: operation.date, commentaire: "",
    dateAffichage: operation.publication.mode === "date" ? operation.publication.date : "",
    coef: operation.coefficient, noteSur: operation.maxGrade, avecNote: true,
    notationLettre: false, noteNegative: false, nonSignificatif: false, ccf: false, elementsProgramme: [],
    ...(homeworkType ? { typeDevoir: pick(homeworkType, ["id", "code", "libelle", "coef"]) } : {}),
  } };
}

export function assertNewEvaluation(raw: unknown, operation: CreateGradebookEvaluation): void {
  const { evaluations, students } = readGradeGrid(raw);
  if (students.some((row) => !isId(asRecord(row.eleve)?.id))) throw new Error("The grade grid contains an unreadable student row.");
  if (evaluations.some((entry) => (entry.idProf == null || entry.idProf === operation.accountId)
    && typeof entry.libelle === "string" && entry.libelle.trim() === operation.label
    && readGradebookDate(entry.date) === operation.date)) {
    throw new Error("You already have an evaluation with this label and date in this gradebook.");
  }
}

const evaluationFields = ["id", "idProf", "nomProf", "idLong", "libelle", "commentaire", "coef", "date",
  "nonSignificatif", "ccf", "noteSur", "notationLettre", "noteNegative", "statutPeriode", "idPeriode",
  "codeMatiere", "codeSSMatiere", "avecNote", "elementsProgramme", "typeDevoir", "dateAffichage", "data",
  "uncSujet", "uncCorrige", "sujet", "corrige", "moyenne"];
const cellFields = ["idNote", "idDevoir", "idPeriode", "coef", "note", "noteSur", "lettre", "notationLettre", "date",
  "devoirLibelle", "ccf", "nonSignificatif", "codeMatiere", "codeSSMatiere", "commentaire", "elementsProgramme", "isGoodNote", "editDate"];

export function saveGradebookPayload(raw: unknown, operation: SaveGradebookNotes): RecordData {
  const { evaluation, rows } = selectGradeColumn(raw, operation);
  if (evaluation.statutPeriode !== "ouvert" || evaluation.avecNote !== true || evaluation.notationLettre !== false
    || evaluation.readOnly === true) {
    throw new Error("The evaluation is not confirmed open for numeric grading.");
  }
  const remaining = new Map(operation.grades.map((item) => [item.studentId, item]));
  const eleves = rows.map(({ student, cell }) => {
    const id = student.id as number;
    const change = remaining.get(id);
    remaining.delete(id);
    const row = { ...pick(student, ["id", "nom", "prenom", "particule"]), devoirs: [] as RecordData[] };
    if (!cell && !change) return row;

    if (change) {
      // A status, incompatible cell type or malformed cell must never be overwritten as if blank.
      if (cell && ((cell.notationLettre != null && cell.notationLettre !== false) || (cell.lettre != null && cell.lettre !== "")
        || (isId(cell.idNote) && typeof cell.note !== "string" && typeof cell.note !== "number")
        || (cell.note != null && cell.note !== "" && readNumber(cell.note) === undefined))) {
        throw new Error(`Student ${id} has a non-numeric or unreadable grade status; it will not be overwritten.`);
      }
      const previous = readNumber(cell?.note) ?? null;
      const expected = change.previousGrade === null ? null : Number(change.previousGrade);
      if (previous !== expected) throw new Error(`The previous grade for student ${id} no longer matches the preview.`);
      const value = Number(change.grade);
      const individualScale = readNumber(cell?.noteSur);
      if (cell?.noteSur != null && (individualScale === undefined || individualScale < 0)) {
        throw new Error(`Student ${id} has an unreadable grade scale.`);
      }
      const scale = individualScale || operation.maxGrade;
      if (value > Math.min(operation.maxGrade, scale) || (value < 0 && evaluation.noteNegative !== true)) {
        throw new Error(`Grade for student ${id} is outside the permitted scale.`);
      }
    }

    // Mirror the web model: inherit missing shared fields, then keep the current cell data.
    const wire: RecordData = { ...pick(evaluation, ["idPeriode", "coef", "noteSur", "notationLettre", "date", "ccf", "nonSignificatif", "codeMatiere", "codeSSMatiere"]),
      ...(cell ? pick(cell, cellFields) : {}), idDevoir: operation.evaluationId };
    if (change) {
      Object.assign(wire, { note: change.grade, lettre: "", isGoodNote: true });
      if (readNumber(wire.noteSur) === 0) Object.assign(wire, { noteSur: evaluation.noteSur, nonSignificatif: evaluation.nonSignificatif });
      if (wire.coef === 0) wire.coef = evaluation.coef;
      wire.devoirLibelle ??= evaluation.libelle;
      wire.commentaire ??= "";
      wire.elementsProgramme ??= [];
    }
    row.devoirs.push(wire);
    return row;
  });
  if (remaining.size) throw new Error("One or more selected students are not in the current grade grid.");
  return { devoirs: [{ ...pick(evaluation, evaluationFields), readOnly: false, eleves }] };
}

export function verifyRecordedGrades(raw: unknown, operation: SaveGradebookNotes): boolean {
  const { rows } = selectGradeColumn(raw, operation);
  const cells = new Map(rows.map(({ student, cell }) => [student.id, cell]));
  return operation.grades.every(({ studentId, grade }) => {
    const cell = cells.get(studentId);
    return cell && (cell.lettre == null || cell.lettre === "") && readNumber(cell.note) === Number(grade);
  });
}

function selectGradeColumn(raw: unknown, operation: SaveGradebookNotes) {
  const { evaluations, students } = readGradeGrid(raw);
  const matches = evaluations.filter(({ id }) => id === operation.evaluationId);
  const evaluation = matches.length === 1 ? matches[0] : undefined;
  if (!evaluation || evaluation.idProf !== operation.accountId || evaluation.idPeriode !== operation.target.periodCode
    || evaluation.codeMatiere !== operation.target.subjectCode || (evaluation.codeSSMatiere ?? "") !== (operation.target.subSubjectCode ?? "")
    || typeof evaluation.libelle !== "string" || evaluation.libelle.trim() !== operation.evaluationLabel
    || evaluation.noteSur !== operation.maxGrade || displayDate(evaluation.dateAffichage) !== operation.displayDate) {
    throw new Error("The evaluation, grade scale or display date does not match the approved preview.");
  }

  const ids = new Set<number>();
  const rows = students.map((row) => {
    const student = asRecord(row.eleve);
    const grades = row.devoirs == null || (Array.isArray(row.devoirs) && row.devoirs.length === 0) ? {} : asRecord(row.devoirs);
    const key = String(operation.evaluationId);
    const cell = asRecord(grades?.[key]);
    if (!student || !isId(student.id) || ids.has(student.id) || !grades
      || (Object.hasOwn(grades, key) && (!cell || (cell.idDevoir != null && cell.idDevoir !== operation.evaluationId)))) {
      throw new Error("The current grade grid contains an unexpected or ambiguous student row.");
    }
    ids.add(student.id);
    return { student, cell };
  });
  return { evaluation, rows };
}

function readGradeGrid(raw: unknown) {
  const grid = asRecord(raw);
  if (!Array.isArray(grid?.devoirs) || !Array.isArray(grid.eleves) || grid.eleves.length === 0) {
    throw new Error("The current grade grid is unreadable or has no students.");
  }
  const evaluations = records(grid.devoirs);
  const students = records(grid.eleves);
  if (students.length !== grid.eleves.length || evaluations.length !== grid.devoirs.length) {
    throw new Error("The current grade grid has malformed entries.");
  }
  return { evaluations, students };
}

function pick(source: RecordData, keys: string[]): RecordData {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

function asRecord(value: unknown): RecordData | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordData : undefined;
}

function records(value: unknown): RecordData[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is RecordData => item !== undefined) : [];
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !/^-?\d+(?:[.,]\d+)?$/.test(value.trim())) return undefined;
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
}

export function readGradebookDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|[ T])/.test(value)) return undefined;
  const parsed = date.safeParse(value.slice(0, 10));
  return parsed.success ? parsed.data : undefined;
}

function displayDate(value: unknown): string | null | undefined {
  return value == null || value === "" ? null : readGradebookDate(value);
}
