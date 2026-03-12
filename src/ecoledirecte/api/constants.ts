/** EcoleDirecte API endpoints, headers, and version defaults. */

export const API_BASE = "https://api.ecoledirecte.com";
export const API_VERSION = "v3";

/** Default app version sent in query strings. Overrideable via config. */
export const DEFAULT_APP_VERSION = "4.96.3";

export function loginUrl(opts: { gtk?: boolean; version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const base = `${API_BASE}/${API_VERSION}/login.awp`;
  if (opts.gtk) return `${base}?gtk=1&v=${v}`;
  return `${base}?v=${v}`;
}

export function doubleAuthUrl(opts: { verb: "get" | "post"; version?: string }): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/connexion/doubleauth.awp?verbe=${opts.verb}&v=${v}`;
}

export type MessageMailbox = "received" | "sent" | "archived" | "draft";

export interface MessagesUrlOptions {
  mailbox?: MessageMailbox;
  folderId?: number;
  query?: string;
  page?: number;
  itemsPerPage?: number;
  version?: string;
}

export function familyMessagesUrl(
  familyId: number,
  opts: MessagesUrlOptions = {},
): string {
  return messagesUrl(`familles/${familyId}`, opts);
}

export function studentMessagesUrl(
  studentId: number,
  opts: MessagesUrlOptions = {},
): string {
  return messagesUrl(`eleves/${studentId}`, opts);
}

export function studentNotesUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/eleves/${studentId}/notes.awp?verbe=get&v=${v}`;
}

export function studentCahierDeTextesUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/Eleves/${studentId}/cahierdetexte.awp?verbe=get&v=${v}`;
}

export function studentVieScolaireUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/eleves/${studentId}/viescolaire.awp?verbe=get&v=${v}`;
}

export function classVieDeLaClasseUrl(classId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/Classes/${classId}/viedelaclasse.awp?verbe=get&v=${v}`;
}

export function studentCarnetCorrespondanceUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/eleves/${studentId}/eleveCarnetCorrespondance.awp?verbe=get&v=${v}`;
}

export function studentSessionsRdvUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/E/${studentId}/sessionsRdv.awp?verbe=get&v=${v}`;
}

export function studentEmploiDuTempsUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/E/${studentId}/emploidutemps.awp?verbe=get&v=${v}`;
}

/**
 * Lightweight "am I still logged in?" probe.
 * The browser calls this route immediately after successful authentication.
 * It accepts `data={}` and returns code 200 with the current X-Token when the
 * session is alive.
 */
export function probeUrl(opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/rdt/sondages.awp?verbe=get&v=${v}`;
}

/** Headers the server exposes via CORS that we may need to capture. */
export const EXPOSED_HEADERS = [
  "X-Token",
  "X-GTK",
  "2FA-Token",
  "Authorization",
  "X-Client",
  "X-Code",
  "WOPI-Token",
  "STREAM-Token",
] as const;

export const CONTENT_TYPE_FORM = "application/x-www-form-urlencoded";

function messagesUrl(scopePath: string, opts: MessagesUrlOptions): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const mailbox = opts.mailbox ?? "received";
  const folderId = opts.folderId ?? 0;
  const page = opts.page ?? 0;
  const itemsPerPage = opts.itemsPerPage ?? 100;
  const query = encodeURIComponent(opts.query ?? "");
  return `${API_BASE}/${API_VERSION}/${scopePath}/messages.awp?force=false&typeRecuperation=${mailbox}&idClasseur=${folderId}&orderBy=date&order=desc&query=${query}&onlyRead=&page=${page}&itemsPerPage=${itemsPerPage}&getAll=0&verbe=get&v=${v}`;
}
