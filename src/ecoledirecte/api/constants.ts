/** EcoleDirecte API endpoints, headers, and version defaults. */

export const API_BASE = "https://api.ecoledirecte.com";
/** Teacher/personnel routes use a separate host observed in live browser traffic. */
export const TEACHER_API_BASE = "https://apip.ecoledirecte.com";
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

export function familyMessageDetailUrl(
  familyId: number,
  messageId: number,
  opts: { mode?: "destinataire" | "expediteur"; version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const mode = opts.mode ?? "destinataire";
  return `${API_BASE}/${API_VERSION}/familles/${familyId}/messages/${messageId}.awp?verbe=get&mode=${mode}&v=${v}`;
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

export function studentProfileUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/eleves/${studentId}.awp?verbe=get&v=${v}`;
}

export function studentCahierDeTextesUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/Eleves/${studentId}/cahierdetexte.awp?verbe=get&v=${v}`;
}

export function studentCahierDeTextesDayUrl(
  studentId: number,
  date: string,
  opts: { version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/Eleves/${studentId}/cahierdetexte/${encodeURIComponent(date)}.awp?verbe=get&v=${v}`;
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

export function renewTokenUrl(opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/renewtoken.awp?verbe=post&v=${v}`;
}

export function familyDocumentsUrl(opts: { archive?: string; version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const archive = opts.archive ?? "";
  return `${API_BASE}/${API_VERSION}/familledocuments.awp?archive=${encodeURIComponent(archive)}&verbe=get&v=${v}`;
}

export function familyInvoicesUrl(opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${API_BASE}/${API_VERSION}/factures.awp?verbe=get&v=${v}`;
}

export function telechargementUrl(
  opts: { fileId: string | number; fileType: string; cToken?: string; version?: string },
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const params = new URLSearchParams({
    verbe: "get",
    fichierId: String(opts.fileId),
    leTypeDeFichier: opts.fileType,
    v,
  });
  if (opts.cToken) params.set("cToken", opts.cToken);
  return `${API_BASE}/${API_VERSION}/telechargement.awp?${params.toString()}`;
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

function messagesUrl(scopePath: string, opts: MessagesUrlOptions, baseUrl: string = API_BASE): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const mailbox = opts.mailbox ?? "received";
  const folderId = opts.folderId ?? 0;
  const page = opts.page ?? 0;
  const itemsPerPage = opts.itemsPerPage ?? 100;
  const query = encodeURIComponent(opts.query ?? "");
  return `${baseUrl}/${API_VERSION}/${scopePath}/messages.awp?force=false&typeRecuperation=${mailbox}&idClasseur=${folderId}&orderBy=date&order=desc&query=${query}&onlyRead=&page=${page}&itemsPerPage=${itemsPerPage}&getAll=0&verbe=get&v=${v}`;
}

// ── Teacher routes ─────────────────────────────────────────────

export function teacherMessagesUrl(
  teacherId: number,
  opts: MessagesUrlOptions = {},
): string {
  return messagesUrl(`enseignants/${teacherId}`, opts, TEACHER_API_BASE);
}

export function teacherMessageDetailUrl(
  teacherId: number,
  messageId: number,
  opts: { mode?: "destinataire" | "expediteur"; version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const mode = opts.mode ?? "destinataire";
  return `${TEACHER_API_BASE}/${API_VERSION}/enseignants/${teacherId}/messages/${messageId}.awp?verbe=get&mode=${mode}&v=${v}`;
}

export function teacherEmploiDuTempsUrl(teacherId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/P/${teacherId}/emploidutemps.awp?verbe=get&v=${v}`;
}

export function teacherCahierDeTextesUrl(
  startDate: string,
  endDate: string,
  opts: { version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/cahierdetexte/loadslots/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}.awp?verbe=get&v=${v}`;
}

export function teacherClassStudentsUrl(classId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/classes/${classId}/eleves.awp?verbe=get&v=${v}`;
}

export function teacherClassCarnetCorrespondanceUrl(
  classId: number,
  opts: { showAll?: boolean; version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const showAll = opts.showAll ? 1 : 0;
  return `${TEACHER_API_BASE}/${API_VERSION}/classes/${classId}/carnetCorrespondance.awp?verbe=get&showAll=${showAll}&v=${v}`;
}

export function teacherStudentProfileUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/eleves/${studentId}.awp?verbe=get&v=${v}`;
}

export function teacherStudentNotesUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/eleves/${studentId}/notes.awp?verbe=get&v=${v}`;
}

export function teacherStudentCarnetCorrespondanceUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/eleves/${studentId}/eleveCarnetCorrespondance.awp?verbe=get&v=${v}`;
}

export function teacherStudentVieScolaireUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/eleves/${studentId}/viescolaire.awp?verbe=get&v=${v}`;
}

export function teacherStudentSessionsRdvUrl(studentId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/E/${studentId}/sessionsRdv.awp?verbe=get&v=${v}`;
}

export function teacherAttendanceRosterUrl(
  entityType: "C" | "G",
  entityId: number,
  opts: { version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const scope = entityType === "G" ? "groupes" : "classes";
  return `${TEACHER_API_BASE}/${API_VERSION}/${scope}/${entityId}/eleves.awp?verbe=get&v=${v}`;
}

export function teacherRoomsUrl(opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/salles.awp?verbe=get&v=${v}`;
}

export function teacherNoteSettingsUrl(teacherId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/enseignants/${teacherId}/parametrages.awp?verbe=get&v=${v}`;
}

export function teacherGradebookCatalogUrl(opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/niveauxListe.awp?verbe=get&v=${v}`;
}

export function teacherGradebookSubjectRouteCode(subjectCode: string, subSubjectCode?: string): string {
  const trimmed = subjectCode.trim();
  if (!trimmed) return "";

  if (trimmed.includes("¤")) return trimmed;

  const trimmedSubSubject = subSubjectCode?.trim();
  return `${trimmed}¤${trimmedSubSubject ?? ""}`;
}

export function teacherGradebookNotesUrl(
  teacherId: number,
  entityType: "C" | "G",
  entityId: number,
  periodCode: string,
  subjectCode: string,
  opts: { subSubjectCode?: string; version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const subjectSegment = encodeURIComponent(teacherGradebookSubjectRouteCode(subjectCode, opts.subSubjectCode));
  return `${TEACHER_API_BASE}/${API_VERSION}/enseignants/${teacherId}/${entityType}/${entityId}/periodes/${encodeURIComponent(periodCode)}/matieres/${subjectSegment}/notes.awp?verbe=get&v=${v}`;
}

export function teacherGradebookAppreciationsUrl(
  teacherId: number,
  entityType: "C" | "G",
  entityId: number,
  subjectCode: string,
  opts: { subSubjectCode?: string; version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const subjectSegment = encodeURIComponent(teacherGradebookSubjectRouteCode(subjectCode, opts.subSubjectCode));
  return `${TEACHER_API_BASE}/${API_VERSION}/enseignants/${teacherId}/${entityType}/${entityId}/periodes/ALL/matieres/${subjectSegment}/appreciations.awp?verbe=get&v=${v}`;
}

export function teacherGradebookPredefinedAppreciationsUrl(
  teacherId: number,
  entityType: "C" | "G",
  entityId: number,
  opts: { version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/Enseignant/${teacherId}/${entityType}/${entityId}/appreciationsPredefinies.awp?verbe=get&v=${v}`;
}

export function teacherCouncilDetailUrl(
  teacherId: number,
  entityType: "C" | "G",
  entityId: number,
  periodCode: string,
  opts: { version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/enseignants/${teacherId}/${entityType}/${entityId}/periodes/${encodeURIComponent(periodCode)}/conseilDeClasse.awp?verbe=get&v=${v}`;
}

export function teacherCouncilPredefinedAppreciationsUrl(
  scope: "Enseignant" | "Prof Principal",
  teacherId: number,
  entityType: "C" | "G",
  entityId: number,
  opts: { version?: string } = {},
): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/${encodeURIComponent(scope)}/${teacherId}/${entityType}/${entityId}/appreciationsPredefinies.awp?verbe=get&v=${v}`;
}

export function teacherLslUrl(teacherId: number, opts: { version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  return `${TEACHER_API_BASE}/${API_VERSION}/P/${teacherId}/LSL.awp?verbe=get&v=${v}`;
}
