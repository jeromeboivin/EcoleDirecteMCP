import { z } from "zod";
import { API_BASE, API_VERSION, TEACHER_API_BASE, type StaffProfile } from "./constants.js";
import { createGradebookEvaluationSchema, saveGradebookNotesSchema } from "./gradebookWrites.js";
import { extendedWriteOptions, localDateTime } from "./extendedWrites.js";

const id = z.number().int().positive().safe();
const date = z.string().date();
const shortText = z.string().trim().min(1).max(120);
const pathSegment = shortText.refine((value) => value !== "." && value !== "..", "Expected an ÉcoleDirecte code");
const text = z.string().min(1).max(1_048_576).refine((value) => value.trim().length > 0, "Content is required");

const recipient = z.object({
  id,
  role: z.enum(["P", "A", "E", "1", "2"]).describe("ÉcoleDirecte contact role: teacher, staff, student, or family contact"),
  kind: z.enum(["to", "cc", "cci"]).default("to"),
  firstName: shortText.optional(),
  lastName: shortText.optional(),
}).strict();

const slot = z.object({
  date,
  entityId: id,
  entityType: z.enum(["C", "G"]),
  entityCode: pathSegment,
  subjectCode: pathSegment,
  courseId: id.optional().describe("If present, must still match the timetable slot at execution"),
}).strict().describe("Copy these exact values from get_teacher_cahier_de_textes");

const side = z.enum(["afaire", "seance"]);
const textbookUrl = z.string().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}, "Use an HTTPS URL without credentials");

export const writeOperationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("send_message"), accountId: id, subject: z.string().trim().min(1).max(255), text,
    recipients: z.array(recipient).max(50),
    delivery: z.discriminatedUnion("mode", [
      z.object({ mode: z.enum(["send", "draft"]) }).strict(),
      z.object({ mode: z.literal("schedule"), at: localDateTime }).strict(),
    ]).optional(),
  }).strict(),
  z.object({ kind: z.literal("add_homework"), accountId: id, slot, text, assignedOn: date,
    onlineSubmission: z.boolean().default(false),
  }).strict(),
  z.object({ kind: z.literal("add_lesson_content"), accountId: id, slot, text }).strict(),
  z.object({ kind: z.literal("attach_cahier_document"), accountId: id, slot, cahierId: id,
    side, filePath: z.string().min(1).max(4096)
      .describe("An absolute path on the MCP server to a regular file (up to 50 MiB)"),
  }).strict(),
  z.object({ kind: z.literal("manage_cahier_entry"), accountId: id, slot, cahierId: id, side,
    change: z.discriminatedUnion("action", [
      z.object({ action: z.literal("edit"), expectedHtml: z.string().max(1_048_576), text }).strict(),
      z.object({ action: z.literal("delete"), expectedHtml: z.string().max(1_048_576) }).strict(),
      z.object({ action: z.literal("add_textbook_link"), url: textbookUrl, label: shortText }).strict(),
      z.object({ action: z.literal("remove_textbook_link"), url: textbookUrl }).strict(),
      z.object({ action: z.literal("delete_attachment"), attachmentId: z.union([id, pathSegment]), expectedName: shortText }).strict(),
    ]),
  }).strict(),
  createGradebookEvaluationSchema,
  saveGradebookNotesSchema,
  ...extendedWriteOptions,
]);

export type WriteOperation = z.infer<typeof writeOperationSchema>;
type SendMessage = Extract<WriteOperation, { kind: "send_message" }>;
export type CahierAddition = Extract<WriteOperation, { kind: "add_homework" | "add_lesson_content" }>;
export type CahierUpload = Extract<WriteOperation, { kind: "attach_cahier_document" }>;
export type CahierSide = CahierUpload["side"];
export type CahierMaintenance = Extract<WriteOperation, { kind: "manage_cahier_entry" }>;

export function staffSendMessageUrl(accountId: number, role: StaffProfile, version: string): string {
  const scope = role === "P" ? "enseignants" : "personnels";
  return `${TEACHER_API_BASE}/${API_VERSION}/${scope}/${accountId}/messages.awp?verbe=post&v=${encodeURIComponent(version)}`;
}

export function formatCahierSubject(code: string): string {
  // The web client uses String.replace (one occurrence of each character).
  return code.replace("/", "_______________").replace("+", "PPPPPPPPPPPPPPP");
}

export function cahierSaveUrl(side: CahierSide, slot: CahierAddition["slot"], version: string): string {
  const entity = encodeURIComponent(slot.entityCode);
  const subject = encodeURIComponent(formatCahierSubject(slot.subjectCode));
  return `${TEACHER_API_BASE}/${API_VERSION}/cahierdetexte/${side}/${entity}/${subject}/${slot.date}.awp?verbe=put&v=${encodeURIComponent(version)}`;
}

// Dropzone resolves the standard host directly; it bypasses the versioned Angular interceptor.
export const cahierUploadUrl = `${API_BASE}/${API_VERSION}/televersement.awp?verbe=post&mode=CDT`;

export function cahierUploadParams(operation: CahierUpload): Record<string, unknown> {
  return {
    idContexte: operation.cahierId,
    side: operation.side,
    dateSaisie: operation.slot.date,
    idEntity: operation.slot.entityId,
    typeEntity: operation.slot.entityType,
    codeMatiere: operation.slot.subjectCode,
  };
}

export function encodePlainText(value: string, message: boolean): string {
  let html = `<p>${value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!)
    .replace(/\r\n?|\n/g, "<br>")}</p>`;
  if (message) {
    // The composer entity-encodes non-ASCII HTML before converting it to Base64.
    html = html.replace(/[^\x00-\x7F]|[\x24\x25\x40]/gu, (char) => `&#${char.codePointAt(0)};`);
  }
  const encoded = Buffer.from(html, "utf8").toString("base64");
  if (encoded.length > 1_048_576) throw new Error("Encoded content exceeds the 1 MiB write limit.");
  return encoded;
}

export function messagePayload(operation: SendMessage, senderRole: StaffProfile, content: string): Record<string, unknown> {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const { id, role, kind, firstName, lastName } of operation.recipients) {
    const selection = role === "2" ? "1" : role;
    const contacts = groups.get(selection) ?? [];
    contacts.push({ id, type: role, to_cc_cci: kind, prenom: firstName, nom: lastName });
    groups.set(selection, contacts);
  }
  return {
    message: {
      subject: operation.subject,
      content,
      groupesDestinataires: [...groups].map(([type, destinataires]) => ({ selection: { type }, destinataires })),
      transfertFiles: [],
      files: [],
      read: true,
      from: { role: senderRole, id: operation.accountId, read: true },
      brouillon: operation.delivery?.mode === "draft",
      ...(operation.delivery?.mode === "schedule" ? { date: operation.delivery.at } : {}),
    },
    anneeMessages: "",
  };
}

export function cahierSavePayload(operation: CahierAddition, slot: Record<string, unknown>, content: string): Record<string, unknown> {
  const body = copySlot(slot);
  const side = { contenu: content, documents: [], commentaires: [], elementsProg: [], liensManuel: [], modeEdit: false };
  if (operation.kind === "add_homework") {
    body.aFaire = { ...side, idCDT: 0, idDevoir: 0, donneLe: operation.assignedOn,
      rendreEnLigne: operation.onlineSubmission, tags: [], cdtPersonnalises: [] };
    body.travailAFaire = true;
  } else {
    body.seance = side;
    body.contenuDeSeance = true;
  }
  return body;
}

export function cahierMaintenanceRequest(operation: CahierMaintenance, raw: Record<string, unknown>, version: string) {
  const { side, cahierId, change } = operation;
  const key = side === "afaire" ? "aFaire" : "seance";
  const detail = record(raw[key]);
  if (raw.idCDT !== cahierId || !detail || (detail.idCDT != null && detail.idCDT !== cahierId)) {
    throw new Error("The cahier entry or side does not match the preview.");
  }
  const url = (path: string, verb: "post" | "delete") => `${TEACHER_API_BASE}/${API_VERSION}/${path}.awp?verbe=${verb}&v=${encodeURIComponent(version)}`;
  if (change.action === "edit" || change.action === "delete") {
    const encoded = detail.contenu;
    const html = typeof encoded === "string" && /^[A-Za-z0-9+/]*={0,2}$/.test(encoded) && encoded.length % 4 === 0
      ? Buffer.from(encoded, "base64").toString("utf8") : undefined;
    if (html !== change.expectedHtml) throw new Error("The cahier text changed since preview.");
    if (change.action === "delete") {
      // Deleting an entry can also affect joined documents or homework submissions.
      if (["documents", "commentaires", "elementsProg", "liensManuel", "cdtPersonnalises"].some((k) =>
        !Array.isArray(detail[k]) ? detail[k] != null : detail[k].length > 0)
        || detail.rendreEnLigne === true || detail.documentsRendusDeposes === true || detail.hasQCM === true) {
        throw new Error("Refusing to delete a cahier entry that has linked material or online submissions.");
      }
      return { url: url(`cahierdetexte/${side}/${cahierId}`, "delete"), body: {} };
    }
    return { url: cahierSaveUrl(side, operation.slot, version), body: { ...copySlot(raw),
      [key]: { ...detail, contenu: encodePlainText(change.text, false), modeEdit: false },
      ...(side === "afaire" ? { travailAFaire: true } : { contenuDeSeance: true }),
    } };
  }
  if (change.action === "delete_attachment") {
    const files = Array.isArray(detail.documents) ? detail.documents.map(record) : [];
    const matches = files.filter((file) => file?.id != null && String(file.id) === String(change.attachmentId));
    if (matches.length !== 1 || matches[0]?.libelle !== change.expectedName) throw new Error("The selected attachment does not match the preview.");
    return { url: url(`cahierdetexte/fichiers/${encodeURIComponent(String(change.attachmentId))}`, "delete"), body: matches[0] };
  }
  if (!Array.isArray(detail.liensManuel)) throw new Error("The current textbook links could not be verified.");
  const matches = detail.liensManuel.map(record).filter((link) => link?.url === change.url);
  if (matches.length !== (change.action === "remove_textbook_link" ? 1 : 0)) throw new Error("The textbook link is missing or already exists.");
  return { url: url(`cahierdetexte/${cahierId}/liensmanuels`, change.action === "add_textbook_link" ? "post" : "delete"),
    body: { typeCDT: side === "afaire" ? "T" : "C", urlLien: change.url,
      ...(change.action === "add_textbook_link" ? { urlLibelle: change.label } : {}) } };
}

function copySlot(slot: Record<string, unknown>): Record<string, unknown> {
  // The editor clones the slot model, retaining timetable and opposite-side metadata.
  const body: Record<string, unknown> = {};
  for (const key of ["color", "date", "entityId", "entityCode", "entityLibelle", "entityType", "text",
    "matiereCode", "matiereLibelle", "salle", "niveaux", "travailAFaire", "contenuDeSeance", "interrogation",
    "idCycleEtab", "libelleCycle", "isFlexible", "isAnnule", "isModifie", "idCDT", "idCours", "start_date", "end_date",
    "aFaire", "seance", "typeSaisie", "temporaire"]) {
    if (slot[key] !== undefined) body[key] = slot[key];
  }
  return body;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
