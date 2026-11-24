import { z } from "zod";
import { API_BASE, API_VERSION, TEACHER_API_BASE, studentCahierDeTextesDayUrl,
  teacherGradebookAppreciationsUrl, teacherGradebookNotesUrl, teacherGradebookPredefinedAppreciationsUrl,
  teacherGradebookSubjectSegment } from "./constants.js";
import type { AccountInfo } from "../auth/types.js";

const id = z.number().int().positive().safe();
const ids = z.array(id).min(1).max(100);
const date = z.string().date();
const year = z.string().regex(/^\d{4}-\d{4}$/);
const label = z.string().trim().min(1).max(160);
const commentary = z.string().min(1).max(2000);
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const localDateTime = z.string().refine((value) => date.safeParse(value.slice(0, 10)).success
  && /^ (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value.slice(10)), "Use local YYYY-MM-DD HH:mm:ss");
const dossier = z.union([id, z.literal(-1), z.literal(-2), z.literal(-3), z.literal(-5)]);
const opaqueId = z.string().min(1).max(1024).regex(/^[^\x00-\x1f\x7f]+$/);
const mixedId = z.union([id, opaqueId.refine((value) => value !== "." && value !== "..")]);
const fileName = label.refine((value) => value !== "." && value !== ".." && !/[\\/:*?"<>|\x00-\x1f]/u.test(value), "Use a single file or folder name");
const gradeTarget = z.object({ entityType: z.enum(["C", "G"]), entityId: id, subjectCode: label,
  subSubjectCode: label.optional(), periodCode: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/) }).strict();

export const extendedWriteOptions = [
  z.object({ kind: z.literal("manage_messages"), accountId: id, change: z.discriminatedUnion("action", [
    z.object({ action: z.enum(["mark_read", "mark_unread", "archive", "unarchive"]), messageIds: ids, messagesYear: year }).strict(),
    z.object({ action: z.enum(["delete", "cancel"]), messageIds: ids, messagesYear: year, dossierId: dossier }).strict(),
    z.object({ action: z.literal("move"), folderId: id, messages: z.array(z.object({ id, dossierId: dossier }).strict()).min(1).max(100) }).strict(),
    z.object({ action: z.literal("reschedule"), messageId: id, messagesYear: year, sendAt: localDateTime }).strict(),
  ]) }).strict(),
  z.object({ kind: z.literal("create_message_folder"), accountId: id, label }).strict(),
  z.object({ kind: z.literal("rename_message_folder"), accountId: id, folderId: id, label }).strict(),
  z.object({ kind: z.literal("set_message_signature"), accountId: id, signature: commentary }).strict(),
  z.object({ kind: z.literal("set_homework_completion"), accountId: id, studentId: id, homeworkId: id, date,
    expectedCompleted: z.boolean(), completed: z.boolean() }).strict(),
  z.object({ kind: z.literal("set_gradebook_appreciation"), accountId: id, target: gradeTarget,
    studentId: id, code: label, expectedText: z.string().max(8000).nullable(), appreciation: commentary }).strict(),
  z.object({ kind: z.literal("manage_gradebook_evaluation"), accountId: id, target: gradeTarget, evaluationId: id,
    expectedLabel: label, expectedDate: date, change: z.discriminatedUnion("action", [
      z.object({ action: z.literal("rename"), label }).strict(),
      z.object({ action: z.literal("delete_ungraded") }).strict(),
    ]) }).strict(),
  z.object({ kind: z.literal("manage_appreciation_template"), accountId: id, entityType: z.enum(["C", "G"]), entityId: id,
    change: z.discriminatedUnion("action", [
      z.object({ action: z.literal("create"), code: label, text: commentary }).strict(),
      z.object({ action: z.literal("update"), templateId: id, expectedCode: label, code: label, text: commentary }).strict(),
      z.object({ action: z.literal("delete"), templateId: id, expectedCode: label }).strict(),
    ]) }).strict(),
  z.object({ kind: z.literal("create_quiz"), accountId: id, title: label, introduction: z.string().max(8000).optional(),
    conclusion: z.string().max(8000).optional(), shuffleQuestions: z.boolean().default(false) }).strict(),
  z.object({ kind: z.literal("manage_quiz"), accountId: id, quizId: id, schoolYear: year, change: z.discriminatedUnion("action", [
    z.object({ action: z.enum(["start", "stop", "remove_association", "refresh_participants", "clear_schedule"]), associationId: id }).strict(),
    z.object({ action: z.literal("associate"), resourceType: z.enum(["EVALUATION", "CDT"]), resourceId: id }).strict(),
    z.object({ action: z.literal("rename"), title: label }).strict(),
    z.object({ action: z.literal("set_tags"), tagIds: z.array(id).max(100) }).strict(),
    z.object({ action: z.literal("delete_unassociated") }).strict(),
  ]) }).strict(),
  z.object({ kind: z.literal("manage_quiz_tag"), accountId: id, schoolYear: year, change: z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), label }).strict(),
    z.object({ action: z.literal("rename"), tagId: id, label }).strict(),
    z.object({ action: z.literal("delete"), tagId: id }).strict(),
  ]) }).strict(),
  z.object({ kind: z.literal("manage_edform"), accountId: id, formId: id, schoolYear: year, change: z.discriminatedUnion("action", [
    z.object({ action: z.literal("publish"), notify: z.boolean() }).strict(),
    z.object({ action: z.enum(["close", "clear_schedule"]) }).strict(),
    z.object({ action: z.literal("schedule"), start: localDateTime, end: localDateTime }).strict(),
  ]) }).strict(),
  z.object({ kind: z.literal("create_edform_draft"), accountId: id, title: label, formType: z.enum(["questionnaire", "form", "survey"]),
    introduction: z.string().max(8000).optional(), conclusion: z.string().max(8000).optional(),
    participants: z.array(z.object({ id, role: z.enum(["P", "A", "E", "1", "2"]) }).strict()).max(100).default([]),
  }).strict(),
  z.object({ kind: z.literal("manage_question"), accountId: id, owner: z.enum(["qcm", "edform"]), ownerId: id, schoolYear: year,
    change: z.discriminatedUnion("action", [
      z.object({ action: z.literal("add_choice"), title: label, prompt: z.string().max(4000).optional(), multiple: z.boolean(),
        choices: z.array(z.object({ text: label, correct: z.boolean().optional() }).strict()).min(2).max(30), required: z.boolean().default(false) }).strict(),
      z.object({ action: z.literal("add_text"), title: label, prompt: z.string().max(4000).optional(), required: z.boolean().default(false) }).strict(),
      z.object({ action: z.literal("rename"), questionId: id, expectedTitle: label, title: label }).strict(),
      z.object({ action: z.literal("delete"), questionId: id, expectedTitle: label }).strict(),
    ]) }).strict(),
  z.object({ kind: z.literal("create_workspace_topic"), accountId: id, workspaceId: id, title: label }).strict(),
  z.object({ kind: z.literal("manage_workspace_topic"), accountId: id, workspaceId: id, topicId: mixedId, expectedTitle: label,
    change: z.discriminatedUnion("action", [
      z.object({ action: z.literal("rename"), title: label }).strict(),
      z.object({ action: z.literal("delete_empty") }).strict(),
      z.object({ action: z.literal("post_message"), message: commentary }).strict(),
      z.object({ action: z.literal("edit_message"), messageId: mixedId, expectedHtml: z.string().max(16000), message: commentary }).strict(),
      z.object({ action: z.literal("delete_message"), messageId: mixedId, expectedHtml: z.string().max(16000) }).strict(),
    ]) }).strict(),
  z.object({ kind: z.literal("manage_cloud_node"), accountId: id, folderId: opaqueId.optional(),
    change: z.discriminatedUnion("action", [
      z.object({ action: z.literal("create_folder"), name: fileName }).strict(),
      z.object({ action: z.literal("rename"), nodeId: opaqueId, expectedName: label, name: fileName }).strict(),
      z.object({ action: z.enum(["trash", "restore"]), nodeId: opaqueId, expectedName: label }).strict(),
    ]) }).strict(),
  z.object({ kind: z.literal("submit_class_attendance"), accountId: id, date, entityType: z.enum(["C", "G"]),
    entityId: id, courseId: id, startTime: clock, endTime: clock,
    students: z.array(z.object({ studentId: id, status: z.enum(["present", "absent", "late", "unchanged"]) }).strict()).min(1).max(200),
  }).strict(),
] as const;

const extendedSchema = z.discriminatedUnion("kind", extendedWriteOptions);
export type ExtendedWrite = z.infer<typeof extendedSchema>;
export const extendedWriteKinds = new Set<string>(extendedWriteOptions.map((option) => option.shape.kind.value));
export type WriteRole = "P" | "A" | "E" | "1" | "2";
type RecordData = Record<string, unknown>;
type Read = (url: string, label: string, body?: RecordData) => Promise<unknown>;
interface Mutation { url: string; body: RecordData; resourceId?: number | string; createsId?: true; opaqueId?: true; idField?: "newId" }

export function isWriteRole(role: string): role is WriteRole {
  return role === "P" || role === "A" || role === "E" || role === "1" || role === "2";
}

export function canMakeExtendedWrite(operation: ExtendedWrite, account: AccountInfo): boolean {
  const role = account.type;
  if (operation.kind === "set_homework_completion") {
    return (role === "E" && account.id === operation.studentId)
      || ((role === "1" || role === "2") && account.students?.some((student) => student.id === operation.studentId) === true);
  }
  if (operation.kind === "manage_messages" || operation.kind === "create_message_folder" || operation.kind === "rename_message_folder") {
    return isWriteRole(role);
  }
  if (operation.kind === "manage_cloud_node") return role === "P" || role === "A" || role === "E";
  return role === "P" || (role === "A" && !["set_gradebook_appreciation", "manage_gradebook_evaluation", "manage_appreciation_template",
    "submit_class_attendance"].includes(operation.kind));
}

export function validateExtendedWrite(operation: ExtendedWrite): void {
  if (operation.kind === "manage_messages") {
    const change = operation.change;
    if ("messageIds" in change) unique(change.messageIds);
    if ("messages" in change) unique(change.messages.map(({ id }) => id));
    if (change.action === "cancel" && change.dossierId !== -2) throw new Error("Only sent messages can be cancelled.");
  }
  if (operation.kind === "set_homework_completion" && operation.completed === operation.expectedCompleted) {
    throw new Error("Choose a different homework completion status.");
  }
  if (operation.kind === "manage_quiz" && operation.change.action === "set_tags") unique(operation.change.tagIds);
  if (operation.kind === "manage_edform" && operation.change.action === "schedule" && operation.change.start >= operation.change.end) {
    throw new Error("The form schedule must end after it starts.");
  }
  if (operation.kind === "set_gradebook_appreciation" && operation.target.periodCode === "ALL") {
    throw new Error("A single period is required to save an appreciation.");
  }
  if (operation.kind === "manage_gradebook_evaluation" && ["ALL", "A999Z"].includes(operation.target.periodCode)) {
    throw new Error("Select a specific grading period.");
  }
  if (operation.kind === "create_edform_draft") {
    const keys = operation.participants.map((entry) => `${entry.role}:${entry.id}`);
    if (keys.length !== new Set(keys).size) throw new Error("Duplicate form participants are not allowed.");
  }
  if (operation.kind === "manage_question") {
    const { change, owner } = operation;
    if (change.action === "add_text" && owner !== "edform") throw new Error("Free-text questions are only supported for EDForms.");
    if (change.action === "add_choice") {
      const correct = change.choices.filter((choice) => choice.correct === true).length;
      if (owner === "qcm" && (correct === 0 || (!change.multiple && correct !== 1))) throw new Error("Provide the correct QCM answers explicitly.");
      if (owner === "edform" && change.choices.some((choice) => choice.correct !== undefined)) throw new Error("EDForms choices do not have correct-answer fields.");
    }
  }
  if (operation.kind === "submit_class_attendance") {
    unique(operation.students.map(({ studentId }) => studentId));
    if (operation.startTime >= operation.endTime) throw new Error("The attendance window must end after it starts.");
    checkTodayInFrance(operation.date);
  }
}

export async function buildExtendedMutation(operation: ExtendedWrite, role: WriteRole, version: string, read: Read): Promise<Mutation> {
  const { accountId } = operation;
  const base = role === "P" || role === "A" ? TEACHER_API_BASE : API_BASE;
  const scope = ({ P: "enseignants", A: "personnels", E: "eleves", "1": "familles", "2": "familles" })[role];
  const url = (path: string, verb: "get" | "put" | "post" | "patch" | "delete", query: Record<string, string> = {}) =>
    `${base}/${API_VERSION}/${path}.awp?${new URLSearchParams({ verbe: verb, ...query, v: version })}`;

  switch (operation.kind) {
    case "manage_messages": {
      const path = `${scope}/${accountId}/messages`;
      const change = operation.change;
      if (change.action === "move") return { url: url(path, "put"), body: { action: "deplacer", idClasseur: change.folderId,
        ids: change.messages.map((message) => `${message.id}:${message.dossierId}`) } };
      if (change.action === "reschedule") return { url: url(path, "put"), resourceId: change.messageId,
        body: { action: "differer", ids: [change.messageId], anneeMessages: change.messagesYear, newDate: change.sendAt } };
      if ("dossierId" in change) return { url: url(path, "delete"), body: { action: change.action === "cancel" ? "annuler" : "supprimer",
        ids: change.messageIds, anneeMessages: change.messagesYear, idDossier: change.dossierId } };
      const action = ({ mark_read: "marquerCommeLu", mark_unread: "marquerCommeNonLu", archive: "archiver", unarchive: "desarchiver" })[change.action];
      return { url: url(path, "put"), body: { action, ids: change.messageIds, anneeMessages: change.messagesYear } };
    }
    case "create_message_folder":
      return { url: url("messagerie/classeurs", "post"), body: { libelle: operation.label }, createsId: true };
    case "rename_message_folder":
      return { url: url(`messagerie/classeur/${operation.folderId}`, "put"), resourceId: operation.folderId,
        body: { id: operation.folderId, libelle: operation.label, type: "classeur", icon: "folder" } };
    case "set_message_signature":
      return { url: url("signatureMessage", "put"), body: { value: plainHtml(operation.signature) } };
    case "set_homework_completion": {
      const data = record(await read(studentCahierDeTextesDayUrl(operation.studentId, operation.date, { version }), "the homework day"));
      const entries = records(data?.matieres).filter((entry) => entry.id === operation.homeworkId);
      const homework = record(entries.length === 1 ? entries[0].aFaire : undefined);
      if (!homework || homework.effectue !== operation.expectedCompleted) throw new Error("The homework or its completion status does not match the preview.");
      return { url: url(`Eleves/${operation.studentId}/cahierdetexte`, "put"), resourceId: operation.homeworkId,
        body: { idDevoirsEffectues: operation.completed ? [operation.homeworkId] : [],
          idDevoirsNonEffectues: operation.completed ? [] : [operation.homeworkId] } };
    }
    case "set_gradebook_appreciation": {
      const t = operation.target;
      const data = record(await read(teacherGradebookAppreciationsUrl(accountId, t.entityType, t.entityId,
        t.subjectCode, { subSubjectCode: t.subSubjectCode, version }), "the current appreciations"));
      const student = only(records(data?.eleves).filter((entry) => record(entry.eleve)?.id === operation.studentId));
      const period = only(records(student?.periodes).filter((entry) => entry.code === t.periodCode));
      const matches = records(period?.appreciations).filter((entry) => entry.code === operation.code);
      const content = matches.length === 1 ? matches[0].contenu : undefined;
      const previous = content === "" || content == null ? null : typeof content === "string" ? Buffer.from(content, "base64").toString("utf8") : undefined;
      if (period?.ouverte !== true || !Array.isArray(period.appreciations) || matches.length > 1
        || previous !== operation.expectedText) throw new Error("The target appreciation is closed, ambiguous or changed.");
      return { url: url(`enseignants/${accountId}/${t.entityType}/${t.entityId}/periodes/${t.periodCode}/matieres/${teacherGradebookSubjectSegment(t.subjectCode, t.subSubjectCode)}/appreciations`, "post"),
        resourceId: operation.studentId, body: { eleves: [{ idEleve: operation.studentId,
          appreciations: [{ code: operation.code, contenu: Buffer.from(operation.appreciation, "utf8").toString("base64") }] }] } };
    }
    case "manage_gradebook_evaluation": {
      const t = operation.target;
      const grid = record(await read(teacherGradebookNotesUrl(accountId, t.entityType, t.entityId, t.periodCode,
        t.subjectCode, { subSubjectCode: t.subSubjectCode, version }), "the current evaluation"));
      const evaluation = only(records(grid?.devoirs).filter((entry) => entry.id === operation.evaluationId));
      if (!evaluation || evaluation.idProf !== accountId || evaluation.codeMatiere !== t.subjectCode
        || (evaluation.codeSSMatiere ?? "") !== (t.subSubjectCode ?? "") || evaluation.idPeriode !== t.periodCode
        || evaluation.statutPeriode !== "ouvert" || evaluation.readOnly === true || evaluation.libelle !== operation.expectedLabel
        || evaluation.date !== operation.expectedDate) throw new Error("The evaluation is closed, not owned by the active teacher, or changed since the preview.");
      const path = `enseignants/${accountId}/${t.entityType}/${t.entityId}/periodes/${t.periodCode}/matieres/${teacherGradebookSubjectSegment(t.subjectCode, t.subSubjectCode)}/devoirs/${operation.evaluationId}`;
      if (operation.change.action === "delete_ungraded") {
        const students = records(grid?.eleves);
        if (!Array.isArray(grid?.eleves) || students.length !== grid.eleves.length || !students.length || (Array.isArray(evaluation.elementsProgramme) && evaluation.elementsProgramme.length)) {
          throw new Error("Could not verify that this evaluation has no grades or competencies.");
        }
        for (const row of students) {
          if (!record(row.eleve) || (row.devoirs != null && !record(row.devoirs) && !(Array.isArray(row.devoirs) && !row.devoirs.length))) {
            throw new Error("Could not verify every student's current grades.");
          }
          const value = record(row.devoirs)?.[String(operation.evaluationId)];
          const cell = record(value);
          if (value != null && (!cell || (cell.idNote != null && cell.idNote !== 0)
            || (cell.note != null && cell.note !== "") || (cell.lettre != null && cell.lettre !== "")
            || (cell.commentaire != null && cell.commentaire !== "") || (Array.isArray(cell.elementsProgramme) && cell.elementsProgramme.length))) {
            throw new Error("Refusing to delete an evaluation that has a recorded grade, status or comment.");
          }
        }
        return { url: url(path, "delete"), resourceId: operation.evaluationId, body: {} };
      }
      return { url: url(path, "put"), resourceId: operation.evaluationId, body: { devoir: { ...evaluation, libelle: operation.change.label } } };
    }
    case "manage_appreciation_template": {
      const { entityType, entityId, change } = operation;
      const teacher = "Enseignant";
      const data = record(await read(teacherGradebookPredefinedAppreciationsUrl(accountId, entityType, entityId, { version }), "the current templates"));
      if (!Array.isArray(data?.appreciations)) throw new Error("The current templates could not be verified.");
      const entries = records(data.appreciations);
      const path = `enseignants/${accountId}/${entityType}/${entityId}/appreciationsPredefinies`;
      if (change.action !== "delete" && entries.some((entry) => entry.code === change.code
        && (change.action === "create" || entry.id !== change.templateId))) throw new Error("That appreciation code already exists.");
      if (change.action === "create") return { url: url(`${teacher}/${accountId}/${entityType}/${entityId}/appreciationsPredefinies`, "post"),
        body: { code: change.code, libelle: Buffer.from(change.text, "utf8").toString("base64") } };
      const existing = only(entries.filter((entry) => entry.id === change.templateId));
      if (!existing || existing.idAuteur !== accountId || existing.code !== change.expectedCode || existing.type !== teacher) {
        throw new Error("The template is not owned by the current teacher or its code changed.");
      }
      return { url: url(`${path}/${change.templateId}`, change.action === "delete" ? "delete" : "put"), resourceId: change.templateId,
        body: change.action === "delete" ? {} : { code: change.code, typeAppreciation: teacher, libelle: Buffer.from(change.text, "utf8").toString("base64") } };
    }
    case "create_quiz":
      return { url: url(`${scope}/${accountId}/qcms`, "post"), createsId: true, body: { qcm: {
        id: 0, idAuteur: accountId, titre: operation.title, introduction: encodedHtml(operation.introduction), conclusion: encodedHtml(operation.conclusion),
        baremeBR: 1, baremeAR: 0, baremeMR: -1, qAleatoire: operation.shuffleQuestions, efface: false, nbQuestions: 0, guid: "",
        created: "", etiquettes: [], evaluations: [], travauxafaire: [],
      } } };
    case "manage_quiz": {
      const root = `${scope}/${accountId}/qcms`;
      const list = await read(url(root, "get"), "the quizzes", { anneeQCMs: operation.schoolYear });
      const quiz = only(records(Array.isArray(list) ? list : record(list)?.qcms).filter((entry) => entry.id === operation.quizId));
      if (!quiz || quiz.idAuteur !== accountId || quiz.efface === true) throw new Error("The current account does not own this quiz.");
      const change = operation.change;
      const path = `${root}/${operation.quizId}`;
      const base = { resourceId: operation.quizId };
      if (change.action === "rename") return { ...base, url: url(path, "put"), body: { qcm: { ...quiz, titre: change.title } } };
      if (change.action === "set_tags") {
        if (change.tagIds.length) {
          const tags = records(await read(url(`${root}/etiquettes`, "get"), "the quiz tags", { anneeQCMs: operation.schoolYear }));
          if (change.tagIds.some((id) => !tags.some((tag) => tag.id === id))) throw new Error("A quiz tag is not available.");
        }
        return { ...base, url: url(path, "patch"), body: { action: "updateEtiquettes", etiquettes: change.tagIds } };
      }
      if (!Array.isArray(quiz.evaluations) || !Array.isArray(quiz.travauxafaire)) throw new Error("The current quiz associations could not be verified.");
      const associations = [...records(quiz.evaluations).map((item) => ({ item, type: "EVALUATION" })),
        ...records(quiz.travauxafaire).map((item) => ({ item, type: "CDT" }))];
      if (change.action === "delete_unassociated") {
        if (quiz.evaluations.length || quiz.travauxafaire.length) throw new Error("Refusing to delete a quiz linked to student work.");
        return { ...base, url: url(path, "delete"), body: { anneeQCMs: operation.schoolYear } };
      }
      if (change.action === "associate") {
        if (associations.some(({ item, type }) => type === change.resourceType && item.idEntite === change.resourceId)) {
          throw new Error("This quiz is already linked to that resource.");
        }
        return { url: url(`${path}/associations`, "post"), createsId: true, body: { idEntite: change.resourceId, typeEntite: change.resourceType } };
      }
      const association = only(associations.filter(({ item }) => item.id === change.associationId));
      if (!association) throw new Error("The quiz association does not match the preview.");
      const link = `${path}/associations/${change.associationId}`;
      if (change.action === "remove_association") return { ...base, url: url(link, "delete"), body: {} };
      if (change.action === "clear_schedule") return { ...base, url: url(link, "patch"), body: { action: "deleteAutomatisation" } };
      if (change.action === "refresh_participants") {
        if (typeof association.item.idEntite !== "number") throw new Error("The association target is unreadable.");
        return { ...base, url: url(link, "patch"), body: { action: "refreshParticipants", idEntite: association.item.idEntite, typeEntite: association.type } };
      }
      return { ...base, url: url(path, "patch"), body: { action: change.action === "start" ? "startQCM" : "stopQCM", idAssociation: change.associationId } };
    }
    case "manage_quiz_tag": {
      const path = `${scope}/${accountId}/qcms/etiquettes`;
      const change = operation.change;
      if (change.action === "create") return { url: url(path, "post"), createsId: true,
        body: { etiquette: { id: 0, idAuteur: accountId, badge: 0, libelle: change.label } } };
      const data = await read(url(path, "get"), "the current quiz tags", { anneeQCMs: operation.schoolYear });
      const tag = only(records(data).filter((item) => item.id === change.tagId));
      if (!tag || tag.idAuteur !== accountId) throw new Error("The quiz tag could not be verified under the active account.");
      return change.action === "delete" ? { url: url(path, "delete"), resourceId: change.tagId, body: { anneeQCMs: operation.schoolYear, ids: [change.tagId] } }
        : { url: url(path, "post"), resourceId: change.tagId, body: { etiquette: { id: change.tagId, idAuteur: accountId, badge: tag.badge, libelle: change.label } } };
    }
    case "manage_edform": {
      const data = record(await read(url("edforms", "get"), "the managed forms", { anneeForms: operation.schoolYear }));
      const form = only(records(data?.forms).filter((entry) => entry.id === operation.formId));
      if (!form || form.idAuteur !== accountId || form.typeAuteur !== role || form.efface === true) throw new Error("The current account does not own this form.");
      const change = operation.change;
      const body = change.action === "publish" ? { action: "startFS", activerNotification: change.notify }
        : change.action === "schedule" ? { action: "editParametresProgrammation", debute: change.start, fini: change.end }
        : { action: change.action === "close" ? "stopFS" : "deleteProgrammation" };
      return { url: url(`edforms/${operation.formId}`, "patch"), resourceId: operation.formId, body };
    }
    case "create_edform_draft":
      return { url: url("edforms", "post"), createsId: true, body: { fs: {
        id: 0, idAuteur: accountId, typeAuteur: role, titre: operation.title,
        typeF: ({ questionnaire: "q", form: "f", survey: "s" })[operation.formType],
        introduction: encodedHtml(operation.introduction), conclusion: encodedHtml(operation.conclusion),
        signature: false, created: "", efface: false, reviewState: 0, nbQuestions: 0, fInsteadOfE: false,
        participants: operation.participants.map((participant) => ({ id: 0, idUser: participant.id, typeUser: participant.role })), observateurs: [],
      } } };
    case "manage_question": {
      const quiz = operation.owner === "qcm";
      const root = quiz ? `${scope}/${accountId}/qcms` : "edforms";
      const yearBody = quiz ? { anneeQCMs: operation.schoolYear } : { anneeForms: operation.schoolYear };
      const listing = await read(url(root, "get"), "the owned questionnaires", yearBody);
      const entries = records(Array.isArray(listing) ? listing : record(listing)?.[quiz ? "qcms" : "forms"]);
      const owner = only(entries.filter((entry) => entry.id === operation.ownerId));
      if (!owner || owner.idAuteur !== accountId || owner.efface === true
        || (quiz ? (!Array.isArray(owner.evaluations) || owner.evaluations.length > 0 || !Array.isArray(owner.travauxafaire) || owner.travauxafaire.length > 0)
          : (owner.typeAuteur !== role || owner.reviewState !== 0 || owner.debute != null || owner.fini != null))) {
        throw new Error("Question editing is limited to owned, unassociated quizzes and unscheduled private forms.");
      }
      const path = `${root}/${operation.ownerId}/questions`;
      const response = await read(url(path, "get"), "the current questions", yearBody);
      const list = Array.isArray(response) ? response : record(response)?.questions;
      const questions = records(list);
      if (!Array.isArray(list) || questions.length !== list.length) throw new Error("The current questions could not be verified.");
      const change = operation.change;
      if (change.action === "delete" || change.action === "rename") {
        const existing = only(questions.filter((entry) => entry.id === change.questionId));
        const formatted = typeof existing?.question === "string" ? Buffer.from(existing.question, "base64").toString("utf8") : undefined;
        if (!existing || (formatted !== change.expectedTitle && formatted !== plainHtml(change.expectedTitle))) {
          throw new Error("The question does not match the expected title.");
        }
        if (!quiz && change.action === "delete" && (!Array.isArray(owner.participants) || owner.participants.length > 0)) {
          throw new Error("Refusing to delete a question from a form with participants.");
        }
        return change.action === "delete" ? { url: url(`${path}/${change.questionId}`, "delete"), resourceId: change.questionId, body: {} }
          : { url: url(`${path}/${change.questionId}`, "put"), resourceId: change.questionId,
            body: { question: { ...existing, question: encodedHtml(change.title) } } };
      }
      if (questions.some((question) => typeof question.ordre !== "number" || !Number.isFinite(question.ordre))) {
        throw new Error("The order of the existing questions is unreadable.");
      }
      const order = Math.max(0, ...questions.map((item) => item.ordre as number)) + 16384;
      const choices = change.action === "add_choice" ? change.choices.map((item) => ({
        id: 0, enonce: encodedHtml(item.text), ...(quiz ? { valide: item.correct === true, correctif: "" } : {}),
      })) : [];
      return { url: url(path, "post"), createsId: true, body: { duplicate: false, question: {
        id: 0, question: encodedHtml(change.title), enonce: encodedHtml(change.prompt), ordre: order, propositions: choices,
        typeQ: change.action === "add_text" ? "textarea" : change.multiple ? "checkbox" : "radio",
        ...(quiz ? { remediation: "", titreSon: "", uncSon: "", srcSon: "", aleatoire: false } : { required: change.required }),
      } } };
    }
    case "create_workspace_topic":
      return { url: url(`${role}/${accountId}/espacestravail/${operation.workspaceId}/topics`, "post"), createsId: true, opaqueId: true,
        body: { idEspace: operation.workspaceId, titre: operation.title } };
    case "manage_workspace_topic": {
      const root = `${role}/${accountId}/espacestravail/${operation.workspaceId}/topics`;
      const topicList = record(await read(url(root, "get"), "the workspace topics"));
      const topic = only(records(topicList?.topics).filter((entry) => entry.id === operation.topicId));
      if (!topic || topic.titre !== operation.expectedTitle) throw new Error("The workspace topic does not match the preview.");
      const path = `${root}/${encodeURIComponent(String(operation.topicId))}`;
      const change = operation.change;
      if (change.action === "rename" || change.action === "delete_empty") {
        if (topic.idAuteur !== accountId || topic.profilAuteur !== role) throw new Error("The active account does not own this topic.");
        if (change.action === "delete_empty" && topic.nbMessages !== 0) throw new Error("Refusing to delete a topic with existing messages.");
        return { url: url(path, change.action === "rename" ? "put" : "delete"), resourceId: operation.topicId,
          body: change.action === "rename" ? { ...topic, titre: change.title } : topic };
      }
      if (change.action === "post_message") return { url: url(`${path}/messages`, "post"), createsId: true, opaqueId: true, body: {
        idTopic: operation.topicId, dateCreation: parisDateTime(), isModere: false, contenu: encodedHtml(change.message),
        auteur: { idAuteur: accountId, profil: role },
      } };
      const discussion = record(await read(url(`${path}/messages`, "get"), "the topic messages"));
      const message = only(records(discussion?.messages).filter((entry) => entry.id === change.messageId));
      const author = record(message?.auteur);
      if (!message || author?.idAuteur !== accountId || author.profil !== role || message.isModere === true
        || typeof message.contenu !== "string" || Buffer.from(message.contenu, "base64").toString("utf8") !== change.expectedHtml) {
        throw new Error("The message changed, is moderated, or belongs to a different author.");
      }
      return { url: url(`${path}/messages/${encodeURIComponent(String(change.messageId))}`, change.action === "edit_message" ? "put" : "delete"),
        resourceId: change.messageId, body: change.action === "edit_message"
          ? { ...message, idTopic: operation.topicId, contenu: encodedHtml(change.message) } : { titleTopic: operation.expectedTitle } };
    }
    case "manage_cloud_node": {
      const root = `cloud/${role === "A" ? "P" : role}/${accountId}`;
      const data = await read(url(root, "get", operation.folderId ? { idFolder: operation.folderId } : {}), "the selected cloud folder", { profondeur: 1 });
      const folder = Array.isArray(data) ? record(data[0]) : undefined;
      if (!folder || folder.type !== "folder" || folder.readonly || typeof folder.id !== "string"
        || (operation.folderId !== undefined && folder.id !== operation.folderId) || !Array.isArray(folder.children)) {
        throw new Error("The cloud folder is read-only or could not be verified.");
      }
      const change = operation.change;
      const children = records(folder.children);
      if (children.length !== folder.children.length) throw new Error("The cloud directory is unreadable.");
      if (change.action === "create_folder" || change.action === "rename") {
        if (folder.isTrash || children.some((item) => typeof item.libelle === "string"
          && item.libelle.normalize("NFC").toLowerCase() === change.name.normalize("NFC").toLowerCase()
          && (change.action === "create_folder" || item.id !== change.nodeId))) throw new Error("That folder or filename is not available.");
        if (change.action === "create_folder") return { url: url(root, "post"), createsId: true, opaqueId: true,
          body: { parentNode: { ...folder, children: [] }, libelle: change.name, typeRessource: "folder" } };
      }
      const node = only(children.filter((item) => item.id === change.nodeId));
      if (!node || node.readonly || node.libelle !== change.expectedName || node.isRoot === true) {
        throw new Error("The cloud item is missing, changed, or read-only.");
      }
      if (change.action === "rename") return { url: url(`cloud/${role}/${accountId}`, "put"), createsId: true, opaqueId: true, idField: "newId",
        body: { node: { ...node, libelle: change.name, children: [] }, newLibelle: change.name,
          ...(node.url !== undefined ? { newUrl: node.url } : {}), ...(node.description !== undefined ? { newDescription: node.description } : {}) } };
      if ((change.action === "restore") !== (folder.isTrash === true)) throw new Error("Use restore inside the trash, or trash outside it.");
      return { url: url(`${root}/visibility`, change.action === "restore" ? "post" : "delete"), resourceId: change.nodeId,
        body: { tabNodes: [{ ...node, children: [] }] } };
    }
    case "submit_class_attendance": {
      checkTodayInFrance(operation.date);
      const root = `${operation.entityType === "C" ? "classes" : "groupes"}/${operation.entityId}`;
      const slots = records(await read(url(`enseignant/${accountId}/appel/horaires`, "get"), "the attendance timetable"));
      const slot = only(slots.filter((entry) => entry.id === operation.courseId));
      const targetMatches = operation.entityType === "G" ? slot?.groupeId === operation.entityId
        : slot?.classeId === operation.entityId && !slot.groupeId;
      if (!slot || !targetMatches || slot.evenementId || slot.isAnnule || slot.isAbsenceProf
        || slot.start_date !== `${operation.date} ${operation.startTime}` || slot.end_date !== `${operation.date} ${operation.endTime}`) {
        throw new Error("This roll-call course, date or time does not match the teacher's current timetable.");
      }
      const roster = record(await read(url(`${root}/eleves`, "get", { idCours: String(operation.courseId) }), "the attendance roster",
        { heureDebut: operation.startTime, heureFin: operation.endTime }));
      const last = record(roster?.appelEnClasse);
      if (!last || last.effectue !== false || (last.dateHeure != null && last.dateHeure !== "")) throw new Error("This roll call may already have been submitted.");
      const entity = record(roster?.entity);
      if (entity?.id !== operation.entityId || entity.type !== operation.entityType || entity.isPrimaire === true) {
        throw new Error("The current roster is not the approved secondary class or group.");
      }
      const students = records(roster?.eleves);
      const statuses = new Map(operation.students.map((s) => [s.studentId, s.status]));
      if (!students.length || students.length !== statuses.size || new Set(students.map((student) => student.id)).size !== statuses.size) {
        throw new Error("The current attendance roster differs from the preview.");
      }
      const eleves = students.map((student) => {
        const status = typeof student.id === "number" ? statuses.get(student.id) : undefined;
        if (!status) throw new Error("A student in the current attendance roster is missing from the preview.");
        if (status === "unchanged") return student;
        if (student.estApprenant || student.estEnStage || student.dispense || student.absentAvant
          || student.isAbsent === true || student.isEnRetard === true) {
          throw new Error("Use unchanged for an apprentice, exempt student or student with an existing attendance status.");
        }
        return { ...student, isAbsent: status === "absent", isEnRetard: status === "late" };
      });
      checkTodayInFrance(operation.date);
      return { url: url(`${root}/appel/horaires/${operation.startTime}-${operation.endTime}`, "post"),
        resourceId: operation.courseId, body: { eleves } };
    }
  }
}

function checkTodayInFrance(date: string): void {
  if (date !== parisDateTime().slice(0, 10)) throw new Error("The roll-call write route only supports today in Europe/Paris.");
}

function parisDateTime(): string {
  const parts = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function record(value: unknown): RecordData | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordData : undefined;
}

function records(value: unknown): RecordData[] {
  return Array.isArray(value) ? value.map(record).filter((entry): entry is RecordData => entry !== undefined) : [];
}

function only<T>(items: T[]): T | undefined { return items.length === 1 ? items[0] : undefined; }

function unique(ids: number[]): void {
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate target IDs are not allowed.");
}

function plainHtml(text: string): string {
  return `<p>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/\r\n?|\n/g, "<br>")}</p>`;
}

function encodedHtml(text: string | undefined): string {
  return text ? Buffer.from(plainHtml(text), "utf8").toString("base64") : "";
}
