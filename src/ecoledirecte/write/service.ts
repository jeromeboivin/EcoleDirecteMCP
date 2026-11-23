import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { basename, extname, isAbsolute } from "node:path";
import { teacherCahierDeTextesUrl, type StaffProfile } from "../api/constants.js";
import {
  cahierSavePayload, cahierSaveUrl, cahierUploadParams, cahierUploadUrl, encodePlainText,
  formatCahierSubject, messagePayload, staffSendMessageUrl, writeOperationSchema,
  type CahierSide, type WriteOperation,
} from "../api/writes.js";
import type { AuthService } from "../auth/service.js";
import type { Authenticated } from "../auth/types.js";
import type { EdHttpClient } from "../http/client.js";

const PLAN_TTL_MS = 5 * 60_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface FilePreview { name: string; size: number; sha256: string }

interface WritePlan {
  id: string;
  expires: number;
  state: Authenticated;
  profile: string | undefined;
  role: StaffProfile;
  operation: WriteOperation;
  content?: string;
  file?: FilePreview;
}

export class WriteOutcomeUnknown extends Error {
  constructor(detail: string) {
    super(`${detail} The write may have succeeded. Check ÉcoleDirecte before preparing another write. No automatic retry was made.`);
  }
}

export class EdWriteService {
  private pending?: WritePlan;

  constructor(
    private readonly http: EdHttpClient,
    private readonly auth: AuthService,
    private readonly enabled = false,
  ) {}

  /** No session validation, account switching, or network calls in this phase. */
  async prepare(input: unknown) {
    const operation = writeOperationSchema.parse(input);
    const { state, account, role } = this.currentActor(operation);
    if (operation.kind === "send_message") {
      if (!operation.recipients.some((recipient) => recipient.kind === "to")) {
        throw new Error("At least one recipient must be in To.");
      }
      if (new Set(operation.recipients.map(({ id, role }) => `${role}:${id}`)).size !== operation.recipients.length) {
        throw new Error("Duplicate recipient IDs for the same role are not allowed.");
      }
    }
    if (operation.kind === "add_homework" && operation.assignedOn > operation.slot.date) {
      throw new Error("assignedOn cannot be after the homework due date (slot.date).");
    }

    const content = "text" in operation ? encodePlainText(operation.text, operation.kind === "send_message") : undefined;
    const file = operation.kind === "attach_cahier_document" ? (await readFileSnapshot(operation.filePath)).preview : undefined;
    const profile = this.auth.getActiveProfile();
    const id = randomUUID();
    const expires = Date.now() + PLAN_TTL_MS;
    this.pending = { id, expires, state, profile, role, operation, content, file };

    return structuredClone({
      planId: id,
      expiresAt: new Date(expires).toISOString(),
      writesEnabled: this.enabled,
      sender: { id: account.id, role, name: account.name, establishment: account.establishment, profile },
      operation: operation.kind === "attach_cahier_document"
        ? { kind: operation.kind, slot: operation.slot, cahierId: operation.cahierId, side: operation.side, filePath: operation.filePath, file }
        : operation,
    });
  }

  async execute(planId: string, confirm: boolean, signal?: AbortSignal) {
    if (!this.enabled) throw new Error("Writes are disabled. Set ECOLEDIRECTE_ENABLE_WRITES=1 in the MCP server environment to enable execution.");
    if (confirm !== true) throw new Error("Explicit confirmation is required to execute a write.");
    const plan = this.pending;
    if (!plan || plan.id !== planId) throw new Error("No matching write plan. Prepare a new preview.");
    this.pending = undefined;
    assertExecutable(plan, signal);
    this.assertActor(plan);

    const { operation, role, content } = plan;
    const version = this.http.version;
    let resourceId: number | string;
    if (operation.kind === "send_message") {
      resourceId = await this.submit("id", () => this.http.postForm(
        staffSendMessageUrl(operation.accountId, role, version), messagePayload(operation, role, content!),
        { includeGtk: false, retry: false },
      ));
    } else {
      const upload = operation.kind === "attach_cahier_document" ? await readFileSnapshot(operation.filePath) : undefined;
      if (upload && (upload.preview.sha256 !== plan.file?.sha256 || upload.preview.size !== plan.file.size)) {
        throw new Error("The file changed since preview. Prepare a new preview; nothing was uploaded.");
      }
      assertExecutable(plan, signal);
      const slot = await this.findSlot(operation);
      assertExecutable(plan, signal);
      this.assertActor(plan);

      if (operation.kind === "attach_cahier_document") {
        if (slot.idCDT !== operation.cahierId || !hasCahierSide(slot, operation.side)) {
          throw new Error("The selected cahier entry or side no longer matches. Nothing was uploaded.");
        }
        const { bytes, preview } = upload!;
        const data = cahierUploadParams(operation);
        const form = new FormData();
        for (const [key, value] of Object.entries(data)) form.set(key, String(value));
        form.set("data", JSON.stringify(data));
        form.set("file", new Blob([bytes], { type: fileMimeType(preview.name) }), preview.name);
        resourceId = await this.submit("id", () => this.http.postMultipartOnce(cahierUploadUrl, form), true);
      } else {
        const side = operation.kind === "add_homework" ? "afaire" : "seance";
        const existing = slot[side === "afaire" ? "aFaire" : "seance"];
        if (existing != null || hasCahierSide(slot, side)) {
          throw new Error("This side of the cahier already contains an entry. Refusing to overwrite it.");
        }
        const flag = cahierSideFlag(slot, side);
        if (flag !== false && flag !== 0 && flag !== "0" && flag !== "false") {
          throw new Error("ÉcoleDirecte did not confirm that this side of the cahier is empty. No write was made.");
        }
        resourceId = await this.submit("idCDT", () => this.http.postForm(
          cahierSaveUrl(side, operation.slot, version), cahierSavePayload(operation, slot, content!),
          { includeGtk: false, retry: false },
        ));
      }
    }
    return { status: "applied" as const, operation: operation.kind, resourceId };
  }

  private currentActor(operation: WriteOperation) {
    const state = this.auth.getState();
    if (state.status !== "authenticated" || !this.http.getToken()) {
      throw new Error("Authenticate with an ÉcoleDirecte staff account first.");
    }
    const current = state.accounts.filter((account) => account.current === true);
    const onlyAccount = state.accounts.length === 1 ? state.accounts[0] : undefined;
    const account = current.length === 1 ? current[0] : onlyAccount?.current === false ? undefined : onlyAccount;
    if (!account || account.id !== operation.accountId) {
      throw new Error("accountId must match the currently active account; write tools never switch accounts.");
    }
    const role = account.type;
    if (role !== "P" && !(role === "A" && operation.kind === "send_message")) {
      throw new Error("Cahier writes require a teacher account (P); message sending requires a teacher or personnel account (P/A).");
    }
    return { state, account, role } as const;
  }

  private assertActor(plan: WritePlan): void {
    const { state, role } = this.currentActor(plan.operation);
    if (state !== plan.state || role !== plan.role || this.auth.getActiveProfile() !== plan.profile) {
      throw new Error("The authenticated session changed. Prepare a new preview.");
    }
  }

  private async findSlot(operation: Exclude<WriteOperation, { kind: "send_message" }>): Promise<Record<string, unknown>> {
    const target = operation.slot;
    const url = teacherCahierDeTextesUrl(target.date, target.date, { version: this.http.version });
    let envelope: Record<string, unknown> | undefined;
    try {
      const response = await this.http.postForm(url, {}, { includeGtk: false, retry: false });
      this.http.captureAuthHeaders(response);
      if (response.ok) envelope = asRecord(await response.json());
    } catch {
      // Treat transport and decoding failures as a failed preflight, not an uncertain write.
    }
    if (envelope?.code !== 200 || !Array.isArray(envelope.data)) {
      throw new Error("Could not verify the current timetable slot. No write was made.");
    }
    // The save URL is keyed by date, entity code and formatted subject, not by course ID.
    const routeMatches = envelope.data.map(asRecord).filter((slot) => slot?.date === target.date
      && slot.entityCode === target.entityCode && typeof slot.matiereCode === "string"
      && formatCahierSubject(slot.matiereCode) === formatCahierSubject(target.subjectCode));
    const slot = routeMatches.length === 1 ? routeMatches[0] : undefined;
    if (!slot || slot.entityType !== target.entityType || slot.entityId !== target.entityId
      || slot.matiereCode !== target.subjectCode || (target.courseId !== undefined && slot.idCours !== target.courseId)
      || isTrue(slot.isAnnule)) {
      throw new Error("The timetable slot is missing, ambiguous, changed, or cancelled. No write was made.");
    }
    return slot;
  }

  private async submit(idField: string, send: () => Promise<Response>, upload = false): Promise<number | string> {
    let response: Response;
    let envelope: Record<string, unknown> | undefined;
    try {
      response = await send();
      if (!upload) this.http.captureAuthHeaders(response);
      envelope = asRecord(await response.json());
    } catch {
      throw new WriteOutcomeUnknown("No usable response was received from ÉcoleDirecte.");
    }
    const code = envelope?.code;
    if (!response.ok || typeof code !== "number") {
      throw new WriteOutcomeUnknown(`ÉcoleDirecte returned an unexpected HTTP ${response.status} response.`);
    }
    // Dropzone accepts 2xx application codes except 235; ordinary form writes require 200.
    if (upload ? code < 200 || code >= 300 || code === 235 : code !== 200) {
      throw new Error(`ÉcoleDirecte did not confirm the write (code ${code}). No retry was made; check ÉcoleDirecte before trying again.`);
    }
    const resourceId = asRecord(envelope?.data)?.[idField];
    if ((typeof resourceId === "number" && Number.isSafeInteger(resourceId) && resourceId > 0)
      || (typeof resourceId === "string" && (/^[1-9]\d*$/.test(resourceId) || (upload && resourceId.trim() !== "" && resourceId.trim() !== "0")))) {
      return resourceId;
    }
    throw new WriteOutcomeUnknown("ÉcoleDirecte returned success without a resource ID.");
  }
}

function assertExecutable(plan: WritePlan, signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Write cancelled before submission. No write was made.");
  if (Date.now() >= plan.expires) throw new Error("This write plan expired. Prepare a new preview.");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function isTrue(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function hasCahierSide(slot: Record<string, unknown>, side: CahierSide): boolean {
  const detail = asRecord(slot[side === "afaire" ? "aFaire" : "seance"]);
  return isTrue(cahierSideFlag(slot, side))
    || (detail !== undefined && (detail.idCDT === slot.idCDT || (typeof detail.contenu === "string" && detail.contenu.length > 0)));
}

function cahierSideFlag(slot: Record<string, unknown>, side: CahierSide): unknown {
  return slot[side === "afaire" ? "travailAFaire" : "contenuDeSeance"];
}

async function readFileSnapshot(filePath: string) {
  const name = basename(filePath);
  if (!isAbsolute(filePath) || /[:\x00-\x1f\x7f]/.test(name)) throw new Error("Use an absolute path with a valid attachment filename.");
  try {
    const file = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size === 0 || stat.size > MAX_FILE_SIZE) {
        throw new Error("Attachment must be a non-empty regular file of at most 50 MiB.");
      }
      const bytes = new Uint8Array(stat.size);
      for (let offset = 0; offset < bytes.length;) {
        const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, offset);
        if (bytesRead === 0) throw new Error("Attachment changed while it was being read.");
        offset += bytesRead;
      }
      const preview: FilePreview = { name, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
      return { bytes, preview };
    } finally {
      await file.close();
    }
  } catch (error) {
    if (error instanceof Error && "code" in error) throw new Error("Could not read the attachment. Check the path and permissions; symlinks are not accepted as files.");
    throw error;
  }
}

function fileMimeType(name: string): string {
  switch (extname(name).toLowerCase()) {
    case ".pdf": return "application/pdf";
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".txt": return "text/plain";
    default: return "application/octet-stream";
  }
}
