import {
  classVieDeLaClasseUrl,
  familyDocumentsUrl,
  familyInvoicesUrl,
  familyMessageDetailUrl,
  familyMessagesUrl,
  studentCahierDeTextesDayUrl,
  studentCahierDeTextesUrl,
  studentCarnetCorrespondanceUrl,
  studentEmploiDuTempsUrl,
  studentMessagesUrl,
  studentNotesUrl,
  studentProfileUrl,
  studentSessionsRdvUrl,
  teacherAttendanceRosterUrl,
  teacherCahierDeTextesUrl,
  teacherClassCarnetCorrespondanceUrl,
  teacherCouncilDetailUrl,
  teacherCouncilPredefinedAppreciationsUrl,
  teacherGradebookAppreciationsUrl,
  teacherClassStudentsUrl,
  teacherGradebookNotesUrl,
  teacherEmploiDuTempsUrl,
  teacherGradebookCatalogUrl,
  teacherGradebookPredefinedAppreciationsUrl,
  teacherGradebookSubjectRouteCode,
  teacherLslUrl,
  teacherMessageDetailUrl,
  teacherMessagesUrl,
  teacherNoteSettingsUrl,
  teacherRoomsUrl,
  teacherStudentCarnetCorrespondanceUrl,
  teacherStudentNotesUrl,
  teacherStudentProfileUrl,
  teacherStudentSessionsRdvUrl,
  teacherStudentVieScolaireUrl,
  telechargementUrl,
  studentVieScolaireUrl,
  type MessageMailbox,
} from "../api/constants.js";
import {
  normalizeCahierDeTextesDayResponse,
  normalizeCahierDeTextesResponse,
  type CahierDeTextesAttachment,
  type CahierDeTextesDayDetailPayload,
  type CahierDeTextesPayload,
} from "../api/cahierDeTextes.js";
import {
  normalizeCarnetCorrespondanceResponse,
  type CarnetCorrespondancePayload,
} from "../api/carnetCorrespondance.js";
import {
  normalizeEmploiDuTempsResponse,
  type EmploiDuTempsPayload,
} from "../api/emploiDuTemps.js";
import {
  documentDownloadFileType,
  normalizeFamilyDocumentsResponse,
  type DocumentCategory,
  type DocumentEntry,
  type FamilyDocumentsPayload,
} from "../api/familyDocuments.js";
import {
  normalizeFamilyInvoicesResponse,
  type FamilyInvoicesPayload,
} from "../api/familyInvoices.js";
import {
  normalizeMessageDetailResponse,
  normalizeMessagesResponse,
  type MessageDetailPayload,
  type MessagesPayload,
} from "../api/messages.js";
import { normalizeNotesResponse, type NotesPayload } from "../api/notes.js";
import {
  normalizeStudentProfileResponse,
  type StudentProfilePayload,
} from "../api/studentProfile.js";
import {
  normalizeSessionsRdvResponse,
  type SessionsRdvPayload,
} from "../api/sessionsRdv.js";
import {
  normalizeVieDeLaClasseResponse,
  type VieDeLaClassePayload,
} from "../api/vieDeLaClasse.js";
import {
  normalizeVieScolaireResponse,
  type VieScolairePayload,
} from "../api/vieScolaire.js";
import {
  normalizeTeacherAttendanceResponse,
  type TeacherAttendancePayload,
} from "../api/teacherAttendance.js";
import {
  normalizeTeacherCahierDeTextesResponse,
  type TeacherCahierDeTextesPayload,
  type TeacherCahierDeTextesSlot,
} from "../api/teacherCahierDeTextes.js";
import {
  normalizeTeacherCarnetCorrespondanceClassResponse,
  type TeacherCarnetCorrespondanceClassPayload,
} from "../api/teacherCarnetCorrespondance.js";
import {
  normalizeTeacherGradebookAppreciationsResponse,
  normalizeTeacherGradebookPredefinedAppreciationsResponse,
  type TeacherPredefinedAppreciation,
  type TeacherGradebookAppreciationsPayload,
  type TeacherGradebookPredefinedAppreciationsPayload,
} from "../api/teacherGradebookAppreciations.js";
import {
  type CatalogClass,
  normalizeTeacherGradebookCatalogResponse,
  type CatalogAttendanceSlot,
  type CatalogEstablishment,
  type CatalogPeriod,
  type TeacherGradebookCatalogPayload,
} from "../api/teacherGradebookCatalog.js";
import {
  normalizeTeacherCouncilResponse,
  type TeacherCouncilPayload,
} from "../api/teacherCouncil.js";
import {
  normalizeTeacherClassStudentsResponse,
  type TeacherClassStudentsPayload,
} from "../api/teacherClassStudents.js";
import {
  normalizeTeacherRoomsResponse,
  type TeacherRoomsPayload,
} from "../api/teacherRooms.js";
import {
  normalizeTeacherNoteSettingsResponse,
  type TeacherNoteSettingsPayload,
} from "../api/teacherNoteSettings.js";
import {
  normalizeTeacherGradebookNotesResponse,
  type TeacherGradebookNotesPayload,
} from "../api/teacherGradebookNotes.js";
import {
  normalizeTeacherLslResponse,
  type TeacherLslCatalogEntry,
  type TeacherLslClassSubject,
  type TeacherLslNotationEntry,
  type TeacherLslPayload,
  type TeacherLslStudent,
} from "../api/teacherLsl.js";
import { ApiCode, type RawApiResponse } from "../api/normalize.js";
import type { AuthService } from "../auth/service.js";
import type { AccountInfo, AuthState, StudentInfo } from "../auth/types.js";
import type { EdHttpClient } from "../http/client.js";

export interface MessageQuery {
  accountId?: number;
  mailbox?: MessageMailbox;
  folderId?: number;
  query?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface StudentMessageQuery extends MessageQuery {
  studentId?: number;
}

export interface FamilyMessageDetailQuery {
  accountId?: number;
  messageId: number;
  messagesYear?: string;
}

export interface StudentNotesQuery {
  accountId?: number;
  studentId?: number;
  periodCode?: string;
}

export interface StudentProfileQuery {
  accountId?: number;
  studentId?: number;
  schoolYear?: string;
}

export interface StudentCahierDeTextesQuery {
  accountId?: number;
  studentId?: number;
  date?: string;
}

export interface StudentCahierDeTextesDayQuery {
  accountId?: number;
  studentId?: number;
  date: string;
}

export type StudentCahierDeTextesAttachmentKind =
  | "homework-resource"
  | "homework-document"
  | "homework-submitted"
  | "lesson-document";

export interface StudentCahierDeTextesAttachmentQuery {
  accountId?: number;
  studentId?: number;
  date: string;
  homeworkId: number;
  attachmentKind: StudentCahierDeTextesAttachmentKind;
  attachmentIndex: number;
}

export interface StudentVieScolaireQuery {
  accountId?: number;
  studentId?: number;
}

export interface StudentCarnetCorrespondanceQuery {
  accountId?: number;
  studentId?: number;
}

export interface StudentSessionsRdvQuery {
  accountId?: number;
  studentId?: number;
}

export interface ClassVieDeLaClasseQuery {
  accountId?: number;
  studentId?: number;
}

export interface StudentEmploiDuTempsQuery {
  accountId?: number;
  studentId?: number;
  date?: string;
}

export interface FamilyDocumentsQuery {
  accountId?: number;
}

export interface FamilyDocumentDownloadQuery {
  accountId?: number;
  documentId: number;
  category: DocumentCategory;
}

export interface FamilyInvoicesQuery {
  accountId?: number;
}

// ── Teacher queries ────────────────────────────────────────────

export interface TeacherQuery {
  accountId?: number;
}

export interface TeacherMessageQuery extends TeacherQuery {
  mailbox?: MessageMailbox;
  folderId?: number;
  query?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface TeacherMessageDetailQuery extends TeacherQuery {
  messageId: number;
  messagesYear?: string;
  mode?: "destinataire" | "expediteur";
}

export interface TeacherEmploiDuTempsQuery extends TeacherQuery {
  dateDebut?: string;
  dateFin?: string;
}

export interface TeacherClassStudentsQuery extends TeacherQuery {
  classId: number;
}

export interface TeacherClassCarnetCorrespondanceQuery extends TeacherQuery {
  classId: number;
  showAll?: boolean;
}

export interface TeacherStudentCarnetCorrespondanceQuery extends TeacherQuery {
  studentId: number;
  schoolYear?: string;
}

export interface TeacherStudentNotesQuery extends TeacherQuery {
  studentId: number;
  periodCode?: string;
}

export interface TeacherAttendanceTargetsQuery extends TeacherQuery {}

export interface TeacherCahierDeTextesQuery extends TeacherQuery {
  dateDebut: string;
  dateFin: string;
  entityId?: number;
  entityType?: TeacherGradebookEntityType;
  subjectCode?: string;
}

export interface TeacherNoteSettingsQuery extends TeacherQuery {}

export interface TeacherCouncilTargetsQuery extends TeacherQuery {}

export interface TeacherLslClassesQuery extends TeacherQuery {}

export interface TeacherLslStudentDetailQuery extends TeacherQuery {
  classId: number;
  studentId: number;
}

export interface TeacherCouncilDetailQuery extends TeacherQuery {
  entityId: number;
  entityType?: TeacherGradebookEntityType;
  periodCode: string;
}

export interface TeacherGradebookCatalogQuery extends TeacherQuery {}

export type TeacherGradebookEntityType = "C" | "G";

export interface TeacherGradebookNotesQuery extends TeacherQuery {
  entityId: number;
  entityType?: TeacherGradebookEntityType;
  periodCode: string;
  subjectCode: string;
  subSubjectCode?: string;
}

export interface TeacherGradebookAppreciationsQuery extends TeacherQuery {
  entityId: number;
  entityType?: TeacherGradebookEntityType;
  periodCode: string;
  subjectCode: string;
  subSubjectCode?: string;
}

export interface TeacherAttendanceRosterQuery extends TeacherQuery {
  entityId: number;
  entityType?: TeacherGradebookEntityType;
  startTime: string;
  endTime: string;
}

export interface FamilyChoice {
  id: number;
  name: string;
  establishment?: string;
  main?: boolean;
  current?: boolean;
}

export interface StudentChoice {
  id: number;
  name: string;
  classId?: number;
  className?: string;
  classCode?: string;
  establishment?: string;
  accountId: number;
  accountName: string;
}

export interface ClassChoice {
  id: number;
  name?: string;
  code?: string;
}

export interface TeacherChoice {
  id: number;
  name: string;
  establishment?: string;
  main?: boolean;
  current?: boolean;
}

export interface TeacherStudentChoice {
  id: number;
  name: string;
  classId?: number;
  className?: string;
  classCode?: string;
}

export interface TeacherGradebookTarget {
  id: number;
  entityType: TeacherGradebookEntityType;
  code?: string;
  label?: string;
  classId?: number;
  subjectCode?: string;
}

export interface TeacherGradebookSubject {
  code: string;
  routeCode: string;
  label?: string;
  subSubjectCode?: string;
}

export interface TeacherAttendanceTarget {
  id: number;
  entityType: TeacherGradebookEntityType;
  code?: string;
  label?: string;
  classId?: number;
  subjectCode?: string;
}

export interface TeacherCouncilPeriod {
  code: string;
  label?: string;
  shortLabel?: string;
  state?: string;
  councilDate?: string;
  startDate?: string;
  endDate?: string;
  appreciationOpen: boolean;
  classAppreciationOpen: boolean;
}

export interface TeacherCouncilTargetSummary {
  id: number;
  entityType: TeacherGradebookEntityType;
  code?: string;
  label?: string;
  isPP: boolean;
}

export interface TeacherCouncilTarget extends TeacherCouncilTargetSummary {
  periods: TeacherCouncilPeriod[];
}

export interface DataFailure {
  ok: false;
  error: string;
  recoverable: boolean;
  availableFamilies?: FamilyChoice[];
  availableStudents?: StudentChoice[];
  availableTeachers?: TeacherChoice[];
}

export interface FamilyMessagesResult extends MessagesPayload {
  scope: "family";
  family: FamilyChoice;
  mailbox: MessageMailbox;
  page: number;
  itemsPerPage: number;
  query: string;
}

export interface StudentMessagesResult extends MessagesPayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
  mailbox: MessageMailbox;
  page: number;
  itemsPerPage: number;
  query: string;
}

export interface FamilyMessageDetailResult extends MessageDetailPayload {
  scope: "family";
  family: FamilyChoice;
  messagesYear: string;
}

export interface StudentNotesResult extends NotesPayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
  selectedPeriodCode?: string;
}

export interface StudentProfileResult extends StudentProfilePayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
  selectedSchoolYear?: string;
}

export interface StudentCahierDeTextesResult extends CahierDeTextesPayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
  selectedDate?: string;
}

export interface StudentCahierDeTextesDayResult extends CahierDeTextesDayDetailPayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
}

export interface StudentCahierDeTextesAttachmentResult {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
  date: string;
  subject: string;
  homeworkId: number;
  attachmentKind: StudentCahierDeTextesAttachmentKind;
  attachmentIndex: number;
  attachment: CahierDeTextesAttachment;
  fileName?: string;
  mimeType?: string;
  contentLength: number;
  contentBase64: string;
}

export interface StudentVieScolaireResult extends VieScolairePayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
}

export interface StudentCarnetCorrespondanceResult extends CarnetCorrespondancePayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
}

export interface StudentSessionsRdvResult extends SessionsRdvPayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
}

export interface ClassVieDeLaClasseResult extends VieDeLaClassePayload {
  scope: "class";
  family: FamilyChoice;
  student: StudentChoice;
  class: ClassChoice;
}

export interface StudentEmploiDuTempsResult extends EmploiDuTempsPayload {
  scope: "student";
  family: FamilyChoice;
  student: StudentChoice;
  selectedDate?: string;
}

export interface FamilyDocumentsResult extends FamilyDocumentsPayload {
  scope: "family";
  family: FamilyChoice;
  totalDocuments: number;
}

export interface FamilyDocumentDownloadResult {
  scope: "family";
  family: FamilyChoice;
  documentId: number;
  category: DocumentCategory;
  label?: string;
  fileName?: string;
  mimeType?: string;
  contentLength: number;
  contentBase64: string;
}

export interface FamilyInvoicesResult extends FamilyInvoicesPayload {
  scope: "family";
  family: FamilyChoice;
}

// ── Teacher result types ───────────────────────────────────────

export interface TeacherMessagesResult extends MessagesPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  mailbox: MessageMailbox;
  page: number;
  itemsPerPage: number;
  query: string;
}

export interface TeacherMessageDetailResult extends MessageDetailPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  messagesYear: string;
}

export interface TeacherEmploiDuTempsResult extends EmploiDuTempsPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  dateDebut?: string;
  dateFin?: string;
}

export interface TeacherClassStudentsResult extends TeacherClassStudentsPayload {
  scope: "class";
  teacher: TeacherChoice;
  class: ClassChoice;
}

export interface TeacherClassCarnetCorrespondanceResult extends TeacherCarnetCorrespondanceClassPayload {
  scope: "class";
  teacher: TeacherChoice;
  class: ClassChoice;
  students: TeacherClassStudentsPayload["students"];
  studentCount: number;
  showAll: boolean;
}

export interface TeacherStudentCarnetCorrespondanceResult {
  scope: "student";
  teacher: TeacherChoice;
  student: TeacherStudentChoice;
  profile: StudentProfilePayload;
  carnet: CarnetCorrespondancePayload;
  schoolLife: VieScolairePayload;
  sessionsRdv: SessionsRdvPayload;
  selectedSchoolYear?: string;
}

export interface TeacherStudentNotesResult extends NotesPayload {
  scope: "student";
  teacher: TeacherChoice;
  student: TeacherStudentChoice;
  selectedPeriodCode?: string;
}

export interface TeacherAttendanceTargetsResult {
  scope: "teacher";
  teacher: TeacherChoice;
  classes: TeacherAttendanceTarget[];
  groups: TeacherAttendanceTarget[];
  suggestedSlots: CatalogAttendanceSlot[];
}

export interface TeacherCahierDeTextesResult extends TeacherCahierDeTextesPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  dateDebut: string;
  dateFin: string;
  selectedEntityId?: number;
  selectedEntityType?: TeacherGradebookEntityType;
  selectedSubjectCode?: string;
}

export interface TeacherCouncilTargetsResult {
  scope: "teacher";
  teacher: TeacherChoice;
  targets: TeacherCouncilTarget[];
}

export interface TeacherLslStudentSummary {
  id: number;
  name: string;
  arrivalOrder?: string;
  gender?: string;
  subjectCount: number;
}

export interface TeacherLslClassSummary {
  id: number;
  label: string;
  principalProfessor: boolean;
  isTerminalClass: boolean;
  isGeneralOrTechno: boolean;
  isTechno: boolean;
  isProfessional: boolean;
  studentCount: number;
  subjectCount: number;
  students: TeacherLslStudentSummary[];
  subjects: TeacherLslClassSubject[];
}

export interface TeacherLslClassContext {
  id: number;
  label: string;
  principalProfessor: boolean;
  isTerminalClass: boolean;
  isGeneralOrTechno: boolean;
  isTechno: boolean;
  isProfessional: boolean;
  studentCount: number;
  subjectCount: number;
  subjects: TeacherLslClassSubject[];
}

export interface TeacherLslClassesResult {
  scope: "teacher";
  teacher: TeacherChoice;
  classes: TeacherLslClassSummary[];
  appreciations: TeacherLslCatalogEntry[];
  examOpinions: TeacherLslCatalogEntry[];
  schoolEngagements: TeacherLslCatalogEntry[];
  detailedSchoolEngagements: TeacherLslCatalogEntry[];
  notations: TeacherLslNotationEntry[];
  headTeacherOnlyExamOpinion: boolean;
  principalProfessorOnlyEngagements: boolean;
}

export interface TeacherLslStudentDetailResult {
  scope: "teacher";
  teacher: TeacherChoice;
  class: TeacherLslClassContext;
  student: TeacherLslStudent;
  appreciations: TeacherLslCatalogEntry[];
  examOpinions: TeacherLslCatalogEntry[];
  schoolEngagements: TeacherLslCatalogEntry[];
  detailedSchoolEngagements: TeacherLslCatalogEntry[];
  notations: TeacherLslNotationEntry[];
  headTeacherOnlyExamOpinion: boolean;
  principalProfessorOnlyEngagements: boolean;
}

export interface TeacherAttendanceRosterResult extends TeacherAttendancePayload {
  scope: "teacher";
  teacher: TeacherChoice;
  target: TeacherAttendanceTarget;
  selectedSlot: CatalogAttendanceSlot;
}

export interface TeacherRoomsResult extends TeacherRoomsPayload {
  scope: "teacher";
  teacher: TeacherChoice;
}

export interface TeacherNoteSettingsResult extends TeacherNoteSettingsPayload {
  scope: "teacher";
  teacher: TeacherChoice;
}

export interface TeacherGradebookCatalogResult extends TeacherGradebookCatalogPayload {
  scope: "teacher";
  teacher: TeacherChoice;
}

export interface TeacherGradebookNotesResult extends TeacherGradebookNotesPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  target: TeacherGradebookTarget;
  subject: TeacherGradebookSubject;
  selectedPeriodCode: string;
}

export interface TeacherGradebookAppreciationsResult extends TeacherGradebookAppreciationsPayload, TeacherGradebookPredefinedAppreciationsPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  target: TeacherGradebookTarget;
  subject: TeacherGradebookSubject;
  selectedPeriodCode: string;
}

export interface TeacherCouncilDetailResult extends TeacherCouncilPayload {
  scope: "teacher";
  teacher: TeacherChoice;
  target: TeacherCouncilTargetSummary;
  selectedPeriod: TeacherCouncilPeriod;
  principalProfessorPredefinedAppreciations: TeacherPredefinedAppreciation[];
  principalProfessorMaxCharacters?: number;
  teacherPredefinedAppreciations: TeacherPredefinedAppreciation[];
  teacherMaxCharacters?: number;
}

export type DataResult<T> = { ok: true; data: T } | DataFailure;

export class EdDataService {
  constructor(
    private readonly http: EdHttpClient,
    private readonly auth: AuthService,
  ) {}

  async listFamilyMessages(query: MessageQuery = {}): Promise<DataResult<FamilyMessagesResult>> {
    const family = await this.ensureFamilySelection(query.accountId);
    if (!family.ok) return family;

    const mailbox = query.mailbox ?? "received";
    const page = query.page ?? 0;
    const itemsPerPage = query.itemsPerPage ?? 100;
    const search = query.query ?? "";
    const response = await this.fetchData(
      familyMessagesUrl(family.data.id, {
        mailbox,
        folderId: query.folderId,
        query: search,
        page,
        itemsPerPage,
        version: this.http.version,
      }),
    );
    if (!response.ok) return response;

    const normalized = normalizeMessagesResponse(response.data, mailbox);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected messages response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "family",
        family: summarizeFamily(family.data),
        mailbox,
        page,
        itemsPerPage,
        query: search,
        ...normalized.data,
      },
    };
  }

  async listStudentMessages(
    query: StudentMessageQuery = {},
  ): Promise<DataResult<StudentMessagesResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const mailbox = query.mailbox ?? "received";
    const page = query.page ?? 0;
    const itemsPerPage = query.itemsPerPage ?? 100;
    const search = query.query ?? "";
    const response = await this.fetchData(
      studentMessagesUrl(selection.data.student.id, {
        mailbox,
        folderId: query.folderId,
        query: search,
        page,
        itemsPerPage,
        version: this.http.version,
      }),
    );
    if (!response.ok) return response;

    const normalized = normalizeMessagesResponse(response.data, mailbox);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected messages response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        mailbox,
        page,
        itemsPerPage,
        query: search,
        ...normalized.data,
      },
    };
  }

  async getFamilyMessageDetail(
    query: FamilyMessageDetailQuery,
  ): Promise<DataResult<FamilyMessageDetailResult>> {
    const family = await this.ensureFamilySelection(query.accountId);
    if (!family.ok) return family;

    if (!Number.isInteger(query.messageId) || query.messageId <= 0) {
      return this.failure("messageId must be a positive integer.", true);
    }

    const messagesYear = normalizeMessagesYear(query.messagesYear);
    const response = await this.fetchData(
      familyMessageDetailUrl(family.data.id, query.messageId, { version: this.http.version }),
      { anneeMessages: messagesYear },
    );
    if (!response.ok) return response;

    const normalized = normalizeMessageDetailResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected message detail response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "family",
        family: summarizeFamily(family.data),
        messagesYear,
        ...normalized.data,
      },
    };
  }

  async getStudentNotes(query: StudentNotesQuery = {}): Promise<DataResult<StudentNotesResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const response = await this.fetchData(
      studentNotesUrl(selection.data.student.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeNotesResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected notes response code ${normalized.code}`,
        true,
      );
    }

    const selectedPeriodCode = query.periodCode?.trim() || undefined;
    const filteredPeriods = selectedPeriodCode
      ? normalized.data.periods.filter((period) => period.code === selectedPeriodCode)
      : normalized.data.periods;
    const filteredGrades = selectedPeriodCode
      ? normalized.data.grades.filter((grade) => grade.periodCode === selectedPeriodCode)
      : normalized.data.grades;

    if (selectedPeriodCode && filteredPeriods.length === 0 && filteredGrades.length === 0) {
      return this.failure(
        `Unknown periodCode '${selectedPeriodCode}'. Retry without a filter to inspect the available periods first.`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        settings: normalized.data.settings,
        periods: filteredPeriods,
        grades: filteredGrades,
        expired: normalized.data.expired,
        ...(normalized.data.classProfile ? { classProfile: normalized.data.classProfile } : {}),
        ...(selectedPeriodCode ? { selectedPeriodCode } : {}),
      },
    };
  }

  async getStudentProfile(query: StudentProfileQuery = {}): Promise<DataResult<StudentProfileResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const selectedSchoolYear = query.schoolYear?.trim() || undefined;
    const response = await this.fetchData(
      studentProfileUrl(selection.data.student.id, { version: this.http.version }),
      { anneeScolaire: selectedSchoolYear ?? "" },
    );
    if (!response.ok) return response;

    const normalized = normalizeStudentProfileResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected student profile response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        ...normalized.data,
        ...(selectedSchoolYear ? { selectedSchoolYear } : {}),
      },
    };
  }

  async getStudentCahierDeTextes(
    query: StudentCahierDeTextesQuery = {},
  ): Promise<DataResult<StudentCahierDeTextesResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const response = await this.fetchData(
      studentCahierDeTextesUrl(selection.data.student.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeCahierDeTextesResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected cahier de textes response code ${normalized.code}`,
        true,
      );
    }

    const selectedDate = query.date?.trim() || undefined;
    const days = selectedDate
      ? normalized.data.days.filter((day) => day.date === selectedDate)
      : normalized.data.days;

    if (selectedDate && days.length === 0) {
      return this.failure(
        `Unknown cahier de textes date '${selectedDate}'. Retry without a filter to inspect available dates first.`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        days,
        totalAssignments: days.reduce((sum, day) => sum + day.assignments.length, 0),
        ...(selectedDate ? { selectedDate } : {}),
      },
    };
  }

  async getStudentCahierDeTextesDay(
    query: StudentCahierDeTextesDayQuery,
  ): Promise<DataResult<StudentCahierDeTextesDayResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const selectedDate = query.date.trim();
    if (selectedDate.length === 0) {
      return this.failure(
        "A cahier de textes date is required. Provide a YYYY-MM-DD date.",
        true,
      );
    }

    const response = await this.fetchData(
      studentCahierDeTextesDayUrl(selection.data.student.id, selectedDate, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeCahierDeTextesDayResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected cahier de textes day response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        ...normalized.data,
      },
    };
  }

  async downloadStudentCahierDeTextesAttachment(
    query: StudentCahierDeTextesAttachmentQuery,
  ): Promise<DataResult<StudentCahierDeTextesAttachmentResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const selectedDate = query.date.trim();
    if (selectedDate.length === 0) {
      return this.failure(
        "A cahier de textes date is required. Provide a YYYY-MM-DD date.",
        true,
      );
    }

    if (!Number.isInteger(query.attachmentIndex) || query.attachmentIndex < 0) {
      return this.failure(
        "attachmentIndex must be a non-negative integer.",
        true,
      );
    }

    const response = await this.fetchData(
      studentCahierDeTextesDayUrl(selection.data.student.id, selectedDate, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeCahierDeTextesDayResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected cahier de textes day response code ${normalized.code}`,
        true,
      );
    }

    const subject = normalized.data.subjects.find((candidate) => candidate.homeworkId === query.homeworkId);
    if (!subject) {
      return this.failure(
        `Unknown homeworkId ${query.homeworkId} for ${selectedDate}. Retry with get_student_cahier_de_textes_day to inspect available homework entries first.`,
        true,
      );
    }

    const attachments = attachmentsForKind(subject, query.attachmentKind);
    const attachment = attachments[query.attachmentIndex];
    if (!attachment) {
      return this.failure(
        `Unknown attachmentIndex ${query.attachmentIndex} for ${query.attachmentKind}. Retry with get_student_cahier_de_textes_day to inspect the available attachments first.`,
        true,
      );
    }

    const url = resolveAttachmentDownloadUrl(attachment, this.http.version);
    if (!url) {
      return this.failure(
        `The selected ${query.attachmentKind} attachment does not expose a direct download URL or a telechargement identifier in the day-detail payload. Retry with get_student_cahier_de_textes_day to inspect the attachment metadata.`,
        true,
      );
    }

    try {
      const download = await this.http.get(url, { includeGtk: false });
      this.http.captureAuthHeaders(download);

      if (!download.ok) {
        return this.failure(
          `Attachment download failed with HTTP ${download.status}.`,
          true,
        );
      }

      const bytes = Buffer.from(await download.arrayBuffer());
      const mimeType = download.headers.get("content-type") ?? undefined;
      const fileName = fileNameFromDisposition(download.headers.get("content-disposition"))
        ?? attachment.name
        ?? inferFileNameFromUrl(url);

      return {
        ok: true,
        data: {
          scope: "student",
          family: summarizeFamily(selection.data.account),
          student: summarizeStudent(selection.data.account, selection.data.student),
          date: selectedDate,
          subject: subject.subject,
          homeworkId: query.homeworkId,
          attachmentKind: query.attachmentKind,
          attachmentIndex: query.attachmentIndex,
          attachment,
          ...(fileName ? { fileName } : {}),
          ...(mimeType ? { mimeType } : {}),
          contentLength: bytes.length,
          contentBase64: bytes.toString("base64"),
        },
      };
    } catch (error) {
      return this.failure(
        `Attachment download failed: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  async getStudentVieScolaire(
    query: StudentVieScolaireQuery = {},
  ): Promise<DataResult<StudentVieScolaireResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const response = await this.fetchData(
      studentVieScolaireUrl(selection.data.student.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeVieScolaireResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected vie scolaire response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        ...normalized.data,
      },
    };
  }

  async listStudentCarnetCorrespondance(
    query: StudentCarnetCorrespondanceQuery = {},
  ): Promise<DataResult<StudentCarnetCorrespondanceResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const response = await this.fetchData(
      studentCarnetCorrespondanceUrl(selection.data.student.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeCarnetCorrespondanceResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected carnet de correspondance response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        ...normalized.data,
      },
    };
  }

  async listStudentSessionsRdv(
    query: StudentSessionsRdvQuery = {},
  ): Promise<DataResult<StudentSessionsRdvResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const response = await this.fetchData(
      studentSessionsRdvUrl(selection.data.student.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeSessionsRdvResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected sessions RDV response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        ...normalized.data,
      },
    };
  }

  async getClassVieDeLaClasse(
    query: ClassVieDeLaClasseQuery = {},
  ): Promise<DataResult<ClassVieDeLaClasseResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const classSelection = this.resolveClass(selection.data.student);
    if (!classSelection.ok) return classSelection;

    const response = await this.fetchData(
      classVieDeLaClasseUrl(classSelection.data.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeVieDeLaClasseResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected vie de la classe response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "class",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        class: classSelection.data,
        ...normalized.data,
      },
    };
  }

  async getFamilyDocuments(query: FamilyDocumentsQuery = {}): Promise<DataResult<FamilyDocumentsResult>> {
    const family = await this.ensureFamilySelection(query.accountId);
    if (!family.ok) return family;

    const response = await this.fetchData(
      familyDocumentsUrl({ version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeFamilyDocumentsResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected family documents response code ${normalized.code}`,
        true,
      );
    }

    const totalDocuments =
      normalized.data.factures.length +
      normalized.data.notes.length +
      normalized.data.viescolaire.length +
      normalized.data.administratifs.length +
      normalized.data.inscriptions.length +
      normalized.data.entreprises.length;

    return {
      ok: true,
      data: {
        scope: "family",
        family: summarizeFamily(family.data),
        totalDocuments,
        ...normalized.data,
      },
    };
  }

  async downloadFamilyDocument(
    query: FamilyDocumentDownloadQuery,
  ): Promise<DataResult<FamilyDocumentDownloadResult>> {
    const family = await this.ensureFamilySelection(query.accountId);
    if (!family.ok) return family;

    if (!Number.isInteger(query.documentId) || query.documentId <= 0) {
      return this.failure("documentId must be a positive integer.", true);
    }

    // Fetch the document list to find the entry and validate the id + category
    const listResponse = await this.fetchData(
      familyDocumentsUrl({ version: this.http.version }),
    );
    if (!listResponse.ok) return listResponse;

    const normalizedList = normalizeFamilyDocumentsResponse(listResponse.data);
    if (!normalizedList.ok || !normalizedList.data) {
      return this.failure(
        normalizedList.message ?? `Unexpected family documents response code ${normalizedList.code}`,
        true,
      );
    }

    const categoryDocs = normalizedList.data[query.category];
    if (!Array.isArray(categoryDocs)) {
      return this.failure(`Unknown document category '${query.category}'.`, true);
    }

    const entry = categoryDocs.find((doc: DocumentEntry) => doc.id === query.documentId);
    if (!entry) {
      return this.failure(
        `Document ${query.documentId} not found in category '${query.category}'. Use get_family_documents to list available documents first.`,
        true,
      );
    }

    const fileType = documentDownloadFileType(query.category, entry);
    const url = telechargementUrl({
      fileId: query.documentId,
      fileType,
      version: this.http.version,
    });

    try {
      const download = await this.http.postForm(
        url,
        { forceDownload: 0, archive: false, anneeArchive: "" },
        { includeGtk: false },
      );
      this.http.captureAuthHeaders(download);

      if (!download.ok) {
        return this.failure(
          `Document download failed with HTTP ${download.status}.`,
          true,
        );
      }

      const bytes = Buffer.from(await download.arrayBuffer());
      const mimeType = download.headers.get("content-type") ?? undefined;
      const fileName = fileNameFromDisposition(download.headers.get("content-disposition"))
        ?? entry.libelle
        ?? undefined;

      return {
        ok: true,
        data: {
          scope: "family",
          family: summarizeFamily(family.data),
          documentId: query.documentId,
          category: query.category,
          ...(entry.libelle ? { label: entry.libelle } : {}),
          ...(fileName ? { fileName } : {}),
          ...(mimeType ? { mimeType } : {}),
          contentLength: bytes.length,
          contentBase64: bytes.toString("base64"),
        },
      };
    } catch (error) {
      return this.failure(
        `Document download failed: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  async listFamilyInvoices(query: FamilyInvoicesQuery = {}): Promise<DataResult<FamilyInvoicesResult>> {
    const family = await this.ensureFamilySelection(query.accountId);
    if (!family.ok) return family;

    const response = await this.fetchData(
      familyInvoicesUrl({ version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeFamilyInvoicesResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected family invoices response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "family",
        family: summarizeFamily(family.data),
        ...normalized.data,
      },
    };
  }

  async getStudentEmploiDuTemps(
    query: StudentEmploiDuTempsQuery = {},
  ): Promise<DataResult<StudentEmploiDuTempsResult>> {
    const selection = await this.ensureStudentSelection(query.studentId, query.accountId);
    if (!selection.ok) return selection;

    const response = await this.fetchData(
      studentEmploiDuTempsUrl(selection.data.student.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeEmploiDuTempsResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected emploi du temps response code ${normalized.code}`,
        true,
      );
    }

    const selectedDate = query.date?.trim() || undefined;
    const days = selectedDate
      ? normalized.data.days.filter((day) => day.date === selectedDate)
      : normalized.data.days;

    if (selectedDate && days.length === 0) {
      return this.failure(
        `Unknown emploi du temps date '${selectedDate}'. Retry without a filter to inspect available dates first.`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        family: summarizeFamily(selection.data.account),
        student: summarizeStudent(selection.data.account, selection.data.student),
        days,
        totalEvents: days.reduce((sum, day) => sum + day.events.length, 0),
        ...(selectedDate ? { selectedDate } : {}),
      },
    };
  }

  // ── Teacher data methods ────────────────────────────────────

  async listTeacherMessages(
    query: TeacherMessageQuery = {},
  ): Promise<DataResult<TeacherMessagesResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const mailbox = query.mailbox ?? "received";
    const page = query.page ?? 0;
    const itemsPerPage = query.itemsPerPage ?? 100;
    const search = query.query ?? "";
    const response = await this.fetchData(
      teacherMessagesUrl(teacher.data.id, {
        mailbox,
        folderId: query.folderId,
        query: search,
        page,
        itemsPerPage,
        version: this.http.version,
      }),
    );
    if (!response.ok) return response;

    const normalized = normalizeMessagesResponse(response.data, mailbox);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected teacher messages response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        mailbox,
        page,
        itemsPerPage,
        query: search,
        ...normalized.data,
      },
    };
  }

  async getTeacherMessageDetail(
    query: TeacherMessageDetailQuery,
  ): Promise<DataResult<TeacherMessageDetailResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    if (!Number.isInteger(query.messageId) || query.messageId <= 0) {
      return this.failure("messageId must be a positive integer.", true);
    }

    const messagesYear = normalizeMessagesYear(query.messagesYear);
    const response = await this.fetchData(
      teacherMessageDetailUrl(teacher.data.id, query.messageId, {
        mode: query.mode,
        version: this.http.version,
      }),
      { anneeMessages: messagesYear },
    );
    if (!response.ok) return response;

    const normalized = normalizeMessageDetailResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected teacher message detail response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        messagesYear,
        ...normalized.data,
      },
    };
  }

  async getTeacherEmploiDuTemps(
    query: TeacherEmploiDuTempsQuery = {},
  ): Promise<DataResult<TeacherEmploiDuTempsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const body: Record<string, unknown> = {};
    if (query.dateDebut) body.dateDebut = query.dateDebut;
    if (query.dateFin) body.dateFin = query.dateFin;
    body.avecTrous = false;

    const response = await this.fetchData(
      teacherEmploiDuTempsUrl(teacher.data.id, { version: this.http.version }),
      body,
    );
    if (!response.ok) return response;

    const normalized = normalizeEmploiDuTempsResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected teacher emploi du temps response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        ...normalized.data,
        ...(query.dateDebut ? { dateDebut: query.dateDebut } : {}),
        ...(query.dateFin ? { dateFin: query.dateFin } : {}),
      },
    };
  }

  async getTeacherClassStudents(
    query: TeacherClassStudentsQuery,
  ): Promise<DataResult<TeacherClassStudentsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    if (!Number.isInteger(query.classId) || query.classId <= 0) {
      return this.failure("classId must be a positive integer.", true);
    }

    const response = await this.fetchData(
      teacherClassStudentsUrl(query.classId, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherClassStudentsResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected class students response code ${normalized.code}`,
        true,
      );
    }

    // Resolve class metadata from teacher's known classes
    const classInfo = teacher.data.classes?.find(c => c.id === query.classId);
    const entity = normalized.data.entity;

    return {
      ok: true,
      data: {
        scope: "class",
        teacher: summarizeTeacher(teacher.data),
        class: {
          id: query.classId,
          ...(classInfo?.label || entity?.label ? { name: classInfo?.label ?? entity?.label } : {}),
          ...(classInfo?.code || entity?.code ? { code: classInfo?.code ?? entity?.code } : {}),
        },
        ...normalized.data,
      },
    };
  }

  async getTeacherClassCarnetCorrespondance(
    query: TeacherClassCarnetCorrespondanceQuery,
  ): Promise<DataResult<TeacherClassCarnetCorrespondanceResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    if (!Number.isInteger(query.classId) || query.classId <= 0) {
      return this.failure("classId must be a positive integer.", true);
    }

    const showAll = query.showAll === true;
    const rosterResponse = await this.fetchData(
      teacherClassStudentsUrl(query.classId, { version: this.http.version }),
    );
    if (!rosterResponse.ok) return rosterResponse;

    const classResponse = await this.fetchData(
      teacherClassCarnetCorrespondanceUrl(query.classId, {
        showAll,
        version: this.http.version,
      }),
    );
    if (!classResponse.ok) return classResponse;

    const normalizedRoster = normalizeTeacherClassStudentsResponse(rosterResponse.data);
    if (!normalizedRoster.ok || !normalizedRoster.data) {
      return this.failure(
        normalizedRoster.message ?? `Unexpected class students response code ${normalizedRoster.code}`,
        true,
      );
    }

    const normalizedClass = normalizeTeacherCarnetCorrespondanceClassResponse(classResponse.data);
    if (!normalizedClass.ok || !normalizedClass.data) {
      return this.failure(
        normalizedClass.message ?? `Unexpected teacher carnet correspondance response code ${normalizedClass.code}`,
        true,
      );
    }

    const classInfo = teacher.data.classes?.find((candidate) => candidate.id === query.classId);
    const entity = normalizedRoster.data.entity;

    return {
      ok: true,
      data: {
        scope: "class",
        teacher: summarizeTeacher(teacher.data),
        class: {
          id: query.classId,
          ...(classInfo?.label || entity?.label ? { name: classInfo?.label ?? entity?.label } : {}),
          ...(classInfo?.code || entity?.code ? { code: classInfo?.code ?? entity?.code } : {}),
        },
        students: normalizedRoster.data.students,
        studentCount: normalizedRoster.data.students.length,
        showAll,
        ...normalizedClass.data,
      },
    };
  }

  async getTeacherStudentCarnetCorrespondance(
    query: TeacherStudentCarnetCorrespondanceQuery,
  ): Promise<DataResult<TeacherStudentCarnetCorrespondanceResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    if (!Number.isInteger(query.studentId) || query.studentId <= 0) {
      return this.failure("studentId must be a positive integer.", true);
    }

    const selectedSchoolYear = query.schoolYear?.trim() || undefined;

    const profileResponse = await this.fetchData(
      teacherStudentProfileUrl(query.studentId, { version: this.http.version }),
      { anneeScolaire: selectedSchoolYear ?? "" },
    );
    if (!profileResponse.ok) return profileResponse;

    const carnetResponse = await this.fetchData(
      teacherStudentCarnetCorrespondanceUrl(query.studentId, { version: this.http.version }),
    );
    if (!carnetResponse.ok) return carnetResponse;

    const schoolLifeResponse = await this.fetchData(
      teacherStudentVieScolaireUrl(query.studentId, { version: this.http.version }),
    );
    if (!schoolLifeResponse.ok) return schoolLifeResponse;

    const sessionsResponse = await this.fetchData(
      teacherStudentSessionsRdvUrl(query.studentId, { version: this.http.version }),
    );
    if (!sessionsResponse.ok) return sessionsResponse;

    const normalizedProfile = normalizeStudentProfileResponse(profileResponse.data);
    if (!normalizedProfile.ok || !normalizedProfile.data) {
      return this.failure(
        normalizedProfile.message ?? `Unexpected teacher student profile response code ${normalizedProfile.code}`,
        true,
      );
    }

    const normalizedCarnet = normalizeCarnetCorrespondanceResponse(carnetResponse.data);
    if (!normalizedCarnet.ok || !normalizedCarnet.data) {
      return this.failure(
        normalizedCarnet.message ?? `Unexpected teacher student carnet response code ${normalizedCarnet.code}`,
        true,
      );
    }

    const normalizedSchoolLife = normalizeVieScolaireResponse(schoolLifeResponse.data);
    if (!normalizedSchoolLife.ok || !normalizedSchoolLife.data) {
      return this.failure(
        normalizedSchoolLife.message ?? `Unexpected teacher student school life response code ${normalizedSchoolLife.code}`,
        true,
      );
    }

    const normalizedSessions = normalizeSessionsRdvResponse(sessionsResponse.data);
    if (!normalizedSessions.ok || !normalizedSessions.data) {
      return this.failure(
        normalizedSessions.message ?? `Unexpected teacher student sessions RDV response code ${normalizedSessions.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        teacher: summarizeTeacher(teacher.data),
        student: summarizeTeacherObservedStudent(normalizedProfile.data),
        profile: normalizedProfile.data,
        carnet: normalizedCarnet.data,
        schoolLife: normalizedSchoolLife.data,
        sessionsRdv: normalizedSessions.data,
        ...(selectedSchoolYear ? { selectedSchoolYear } : {}),
      },
    };
  }

  async getTeacherStudentNotes(
    query: TeacherStudentNotesQuery,
  ): Promise<DataResult<TeacherStudentNotesResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    if (!Number.isInteger(query.studentId) || query.studentId <= 0) {
      return this.failure("studentId must be a positive integer.", true);
    }

    const profileResponse = await this.fetchData(
      teacherStudentProfileUrl(query.studentId, { version: this.http.version }),
    );
    if (!profileResponse.ok) return profileResponse;

    const normalizedProfile = normalizeStudentProfileResponse(profileResponse.data);
    if (!normalizedProfile.ok || !normalizedProfile.data) {
      return this.failure(
        normalizedProfile.message ?? `Unexpected teacher student profile response code ${normalizedProfile.code}`,
        true,
      );
    }

    const notesResponse = await this.fetchData(
      teacherStudentNotesUrl(query.studentId, { version: this.http.version }),
    );
    if (!notesResponse.ok) return notesResponse;

    const normalized = normalizeNotesResponse(notesResponse.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected notes response code ${normalized.code}`,
        true,
      );
    }

    const selectedPeriodCode = query.periodCode?.trim() || undefined;
    const filteredPeriods = selectedPeriodCode
      ? normalized.data.periods.filter((period) => period.code === selectedPeriodCode)
      : normalized.data.periods;
    const filteredGrades = selectedPeriodCode
      ? normalized.data.grades.filter((grade) => grade.periodCode === selectedPeriodCode)
      : normalized.data.grades;

    if (selectedPeriodCode && filteredPeriods.length === 0 && filteredGrades.length === 0) {
      return this.failure(
        `Unknown periodCode '${selectedPeriodCode}'. Retry without a filter to inspect the available periods first.`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "student",
        teacher: summarizeTeacher(teacher.data),
        student: summarizeTeacherObservedStudent(normalizedProfile.data),
        settings: normalized.data.settings,
        periods: filteredPeriods,
        grades: filteredGrades,
        expired: normalized.data.expired,
        ...(normalized.data.classProfile ? { classProfile: normalized.data.classProfile } : {}),
        ...(selectedPeriodCode ? { selectedPeriodCode } : {}),
      },
    };
  }

  async listTeacherAttendanceTargets(
    query: TeacherAttendanceTargetsQuery = {},
  ): Promise<DataResult<TeacherAttendanceTargetsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const catalog = await this.fetchTeacherCatalogPayload(teacher.data);
    if (!catalog.ok) return catalog;

    const catalogClasses = catalog.data.establishments.flatMap((establishment) =>
      establishment.classes.map((teacherClass) => ({
        id: teacherClass.id,
        entityType: "C" as const,
        ...(teacherClass.code ? { code: teacherClass.code } : {}),
        ...(teacherClass.label ? { label: teacherClass.label } : {}),
      })),
    );
    const catalogGroups = catalog.data.establishments.flatMap((establishment) =>
      establishment.groups.map((group) => ({
        id: group.id,
        entityType: "G" as const,
        ...(group.code ? { code: group.code } : {}),
        ...(group.label ? { label: group.label } : {}),
      })),
    );

    const metadataClasses = (teacher.data.classes ?? []).map((teacherClass) => ({
      id: teacherClass.id,
      entityType: "C" as const,
      ...(teacherClass.code ? { code: teacherClass.code } : {}),
      ...(teacherClass.label ? { label: teacherClass.label } : {}),
    }));
    const metadataGroups = (teacher.data.groups ?? []).map((group) => ({
      id: group.id,
      entityType: "G" as const,
      ...(group.code ? { code: group.code } : {}),
      ...(group.label ? { label: group.label } : {}),
      ...(group.classId !== undefined ? { classId: group.classId } : {}),
      ...(group.subjectCode ? { subjectCode: group.subjectCode } : {}),
    }));

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        classes: mergeTeacherAttendanceTargets(metadataClasses, catalogClasses),
        groups: mergeTeacherAttendanceTargets(metadataGroups, catalogGroups),
        suggestedSlots: catalog.data.attendanceGrid,
      },
    };
  }

  async getTeacherCahierDeTextes(
    query: TeacherCahierDeTextesQuery,
  ): Promise<DataResult<TeacherCahierDeTextesResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const dateDebut = normalizeIsoDate(query.dateDebut);
    const dateFin = normalizeIsoDate(query.dateFin);
    if (!dateDebut) {
      return this.failure("dateDebut must use YYYY-MM-DD format.", true);
    }
    if (!dateFin) {
      return this.failure("dateFin must use YYYY-MM-DD format.", true);
    }
    if (dateDebut > dateFin) {
      return this.failure("dateDebut must be before or equal to dateFin.", true);
    }

    const response = await this.fetchData(
      teacherCahierDeTextesUrl(dateDebut, dateFin, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherCahierDeTextesResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected teacher cahier de textes response code ${normalized.code}`,
        true,
      );
    }

    const selectedEntityId = query.entityId;
    const selectedEntityType = query.entityType?.trim() as TeacherGradebookEntityType | undefined;
    const selectedSubjectCode = query.subjectCode?.trim();
    const slots = normalized.data.slots.filter((slot) => {
      if (selectedEntityId !== undefined && slot.entityId !== selectedEntityId) return false;
      if (selectedEntityType && slot.entityType !== selectedEntityType) return false;
      if (selectedSubjectCode && slot.subjectCode?.toLowerCase() !== selectedSubjectCode.toLowerCase()) return false;
      return true;
    });

    if ((selectedEntityId !== undefined || selectedEntityType || selectedSubjectCode) && slots.length === 0) {
      return this.failure(
        "No teacher cahier de textes slots match the selected filters. Retry without filters to inspect the available entity and subject codes first.",
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        dateDebut,
        dateFin,
        slots,
        slotCount: slots.length,
        homeworkCount: slots.filter((slot) => slot.hasHomework).length,
        lessonContentCount: slots.filter((slot) => slot.hasLessonContent).length,
        ...(selectedEntityId !== undefined ? { selectedEntityId } : {}),
        ...(selectedEntityType ? { selectedEntityType } : {}),
        ...(selectedSubjectCode ? { selectedSubjectCode } : {}),
      },
    };
  }

  async listTeacherRooms(
    query: TeacherQuery = {},
  ): Promise<DataResult<TeacherRoomsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const response = await this.fetchData(
      teacherRoomsUrl({ version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherRoomsResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected rooms response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        ...normalized.data,
      },
    };
  }

  async getTeacherNoteSettings(
    query: TeacherNoteSettingsQuery = {},
  ): Promise<DataResult<TeacherNoteSettingsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const response = await this.fetchData(
      teacherNoteSettingsUrl(teacher.data.id, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherNoteSettingsResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected note settings response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        ...normalized.data,
      },
    };
  }

  async listTeacherClasses(
    query: TeacherQuery = {},
  ): Promise<DataResult<{ scope: "teacher"; teacher: TeacherChoice; classes: AccountInfo["classes"] }>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        classes: teacher.data.classes ?? [],
      },
    };
  }

  async listTeacherCouncilTargets(
    query: TeacherCouncilTargetsQuery = {},
  ): Promise<DataResult<TeacherCouncilTargetsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const catalog = await this.fetchTeacherCatalogPayload(teacher.data);
    if (!catalog.ok) return catalog;

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        targets: buildTeacherCouncilTargets(teacher.data, catalog.data),
      },
    };
  }

  async listTeacherLslClasses(
    query: TeacherLslClassesQuery = {},
  ): Promise<DataResult<TeacherLslClassesResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const lsl = await this.fetchTeacherLslPayload(teacher.data.id);
    if (!lsl.ok) return lsl;

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        classes: lsl.data.classes.map((entry) => summarizeTeacherLslClass(entry)),
        appreciations: lsl.data.appreciations,
        examOpinions: lsl.data.examOpinions,
        schoolEngagements: lsl.data.schoolEngagements,
        detailedSchoolEngagements: lsl.data.detailedSchoolEngagements,
        notations: lsl.data.notations,
        headTeacherOnlyExamOpinion: lsl.data.headTeacherOnlyExamOpinion,
        principalProfessorOnlyEngagements: lsl.data.principalProfessorOnlyEngagements,
      },
    };
  }

  async getTeacherLslStudentDetail(
    query: TeacherLslStudentDetailQuery,
  ): Promise<DataResult<TeacherLslStudentDetailResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    if (!Number.isInteger(query.classId) || query.classId <= 0) {
      return this.failure("classId must be a positive integer.", true);
    }
    if (!Number.isInteger(query.studentId) || query.studentId <= 0) {
      return this.failure("studentId must be a positive integer.", true);
    }

    const lsl = await this.fetchTeacherLslPayload(teacher.data.id);
    if (!lsl.ok) return lsl;

    const classEntry = lsl.data.classes.find((candidate) => candidate.id === query.classId);
    if (!classEntry) {
      return this.failure(
        `No LSL class matches classId ${query.classId}. Use list_teacher_lsl_classes first.`,
        true,
      );
    }

    const student = classEntry.students.find((candidate) => candidate.id === query.studentId);
    if (!student) {
      const availableStudents = classEntry.students.map((candidate) => `${candidate.id}:${candidate.name}`).join(", ");
      return this.failure(
        `No LSL student matches studentId ${query.studentId} in ${classEntry.label}. Available students: ${availableStudents || "none"}.`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        class: summarizeTeacherLslClassContext(classEntry),
        student,
        appreciations: lsl.data.appreciations,
        examOpinions: lsl.data.examOpinions,
        schoolEngagements: lsl.data.schoolEngagements,
        detailedSchoolEngagements: lsl.data.detailedSchoolEngagements,
        notations: lsl.data.notations,
        headTeacherOnlyExamOpinion: lsl.data.headTeacherOnlyExamOpinion,
        principalProfessorOnlyEngagements: lsl.data.principalProfessorOnlyEngagements,
      },
    };
  }

  async getTeacherGradebookCatalog(
    query: TeacherGradebookCatalogQuery = {},
  ): Promise<DataResult<TeacherGradebookCatalogResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const catalog = await this.fetchTeacherCatalogPayload(teacher.data);
    if (!catalog.ok) return catalog;

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        ...catalog.data,
      },
    };
  }

  async getTeacherGradebookNotes(
    query: TeacherGradebookNotesQuery,
  ): Promise<DataResult<TeacherGradebookNotesResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const entityType = query.entityType ?? "C";
    const response = await this.fetchData(
      teacherGradebookNotesUrl(
        teacher.data.id,
        entityType,
        query.entityId,
        query.periodCode,
        query.subjectCode,
        { subSubjectCode: query.subSubjectCode, version: this.http.version },
      ),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherGradebookNotesResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected gradebook notes response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        target: summarizeTeacherGradebookTarget(teacher.data, query.entityId, entityType),
        subject: summarizeTeacherGradebookSubject(teacher.data, query.subjectCode, query.subSubjectCode),
        selectedPeriodCode: query.periodCode,
        ...normalized.data,
      },
    };
  }

  async getTeacherGradebookAppreciations(
    query: TeacherGradebookAppreciationsQuery,
  ): Promise<DataResult<TeacherGradebookAppreciationsResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const entityType = query.entityType ?? "C";
    const appreciationResponse = await this.fetchData(
      teacherGradebookAppreciationsUrl(
        teacher.data.id,
        entityType,
        query.entityId,
        query.subjectCode,
        { subSubjectCode: query.subSubjectCode, version: this.http.version },
      ),
    );
    if (!appreciationResponse.ok) return appreciationResponse;

    const predefinedResponse = await this.fetchData(
      teacherGradebookPredefinedAppreciationsUrl(
        teacher.data.id,
        entityType,
        query.entityId,
        { version: this.http.version },
      ),
    );
    if (!predefinedResponse.ok) return predefinedResponse;

    const normalizedAppreciations = normalizeTeacherGradebookAppreciationsResponse(appreciationResponse.data);
    if (!normalizedAppreciations.ok || !normalizedAppreciations.data) {
      return this.failure(
        normalizedAppreciations.message ?? `Unexpected gradebook appreciations response code ${normalizedAppreciations.code}`,
        true,
      );
    }

    const normalizedPredefined = normalizeTeacherGradebookPredefinedAppreciationsResponse(predefinedResponse.data);
    if (!normalizedPredefined.ok || !normalizedPredefined.data) {
      return this.failure(
        normalizedPredefined.message ?? `Unexpected predefined appreciations response code ${normalizedPredefined.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        target: summarizeTeacherGradebookTarget(teacher.data, query.entityId, entityType),
        subject: summarizeTeacherGradebookSubject(teacher.data, query.subjectCode, query.subSubjectCode),
        selectedPeriodCode: query.periodCode,
        ...normalizedAppreciations.data,
        ...normalizedPredefined.data,
      },
    };
  }

  async getTeacherCouncilDetail(
    query: TeacherCouncilDetailQuery,
  ): Promise<DataResult<TeacherCouncilDetailResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const entityType = query.entityType ?? "C";
    const catalog = await this.fetchTeacherCatalogPayload(teacher.data);
    if (!catalog.ok) return catalog;

    const targets = buildTeacherCouncilTargets(teacher.data, catalog.data);
    const target = targets.find((candidate) => candidate.id === query.entityId && candidate.entityType === entityType);
    if (!target) {
      return this.failure(
        `No council target matches ${entityType} ${query.entityId}. Use list_teacher_council_targets first.`,
        true,
      );
    }

    const selectedPeriod = target.periods.find((period) => period.code === query.periodCode);
    if (!selectedPeriod) {
      const availablePeriods = target.periods.map((period) => period.code).join(", ");
      return this.failure(
        `Period ${query.periodCode} is not available for ${target.label ?? target.code ?? `target ${target.id}`}. Available periods: ${availablePeriods || "none"}.`,
        true,
      );
    }

    const councilResponse = await this.fetchData(
      teacherCouncilDetailUrl(
        teacher.data.id,
        entityType,
        query.entityId,
        query.periodCode,
        { version: this.http.version },
      ),
    );
    if (!councilResponse.ok) return councilResponse;

    const ppTemplatesResponse = await this.fetchData(
      teacherCouncilPredefinedAppreciationsUrl(
        "Prof Principal",
        teacher.data.id,
        entityType,
        query.entityId,
        { version: this.http.version },
      ),
    );
    if (!ppTemplatesResponse.ok) return ppTemplatesResponse;

    const teacherTemplatesResponse = await this.fetchData(
      teacherCouncilPredefinedAppreciationsUrl(
        "Enseignant",
        teacher.data.id,
        entityType,
        query.entityId,
        { version: this.http.version },
      ),
    );
    if (!teacherTemplatesResponse.ok) return teacherTemplatesResponse;

    const normalizedCouncil = normalizeTeacherCouncilResponse(councilResponse.data);
    if (!normalizedCouncil.ok || !normalizedCouncil.data) {
      return this.failure(
        normalizedCouncil.message ?? `Unexpected council detail response code ${normalizedCouncil.code}`,
        true,
      );
    }

    const normalizedPpTemplates = normalizeTeacherGradebookPredefinedAppreciationsResponse(ppTemplatesResponse.data);
    if (!normalizedPpTemplates.ok || !normalizedPpTemplates.data) {
      return this.failure(
        normalizedPpTemplates.message ?? `Unexpected principal-professor template response code ${normalizedPpTemplates.code}`,
        true,
      );
    }

    const normalizedTeacherTemplates = normalizeTeacherGradebookPredefinedAppreciationsResponse(teacherTemplatesResponse.data);
    if (!normalizedTeacherTemplates.ok || !normalizedTeacherTemplates.data) {
      return this.failure(
        normalizedTeacherTemplates.message ?? `Unexpected teacher template response code ${normalizedTeacherTemplates.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        target: summarizeTeacherCouncilTarget(target),
        selectedPeriod,
        ...normalizedCouncil.data,
        principalProfessorPredefinedAppreciations: normalizedPpTemplates.data.predefinedAppreciations,
        ...(normalizedPpTemplates.data.maxCharacters !== undefined
          ? { principalProfessorMaxCharacters: normalizedPpTemplates.data.maxCharacters }
          : {}),
        teacherPredefinedAppreciations: normalizedTeacherTemplates.data.predefinedAppreciations,
        ...(normalizedTeacherTemplates.data.maxCharacters !== undefined
          ? { teacherMaxCharacters: normalizedTeacherTemplates.data.maxCharacters }
          : {}),
      },
    };
  }

  async getTeacherAttendanceRoster(
    query: TeacherAttendanceRosterQuery,
  ): Promise<DataResult<TeacherAttendanceRosterResult>> {
    const teacher = await this.ensureTeacherSelection(query.accountId);
    if (!teacher.ok) return teacher;

    const entityType = query.entityType ?? "C";
    const startTime = normalizeAttendanceTime(query.startTime);
    const endTime = normalizeAttendanceTime(query.endTime);
    if (!startTime) {
      return this.failure("startTime must use HH:MM format.", true);
    }
    if (!endTime) {
      return this.failure("endTime must use HH:MM format.", true);
    }

    const response = await this.fetchData(
      teacherAttendanceRosterUrl(entityType, query.entityId, { version: this.http.version }),
      { heureDebut: startTime, heureFin: endTime },
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherAttendanceResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected attendance roster response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: {
        scope: "teacher",
        teacher: summarizeTeacher(teacher.data),
        target: summarizeTeacherAttendanceTarget(
          teacher.data,
          query.entityId,
          entityType,
          normalized.data.entity,
        ),
        selectedSlot: { start: startTime, end: endTime },
        ...normalized.data,
      },
    };
  }

  async listAllStudents(): Promise<DataResult<StudentChoice[]>> {
    const authState = await this.ensureReadyAuth();
    if (!authState.ok) return authState;

    const candidates = authState.accounts.flatMap(account =>
      (account.students ?? []).map(student => summarizeStudent(account, student)),
    );

    if (candidates.length === 0) {
      return this.failure(
        "No student metadata is available for the authenticated account(s). Re-authenticate or import a session that includes accounts and students.",
        false,
      );
    }

    return { ok: true, data: candidates };
  }

  private async fetchTeacherCatalogPayload(account?: AccountInfo): Promise<DataResult<TeacherGradebookCatalogPayload>> {
    const response = await this.fetchData(
      teacherGradebookCatalogUrl({ version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherGradebookCatalogResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected teacher catalog response code ${normalized.code}`,
        true,
      );
    }

    return {
      ok: true,
      data: account ? reconcileTeacherCatalogPayload(account, normalized.data) : normalized.data,
    };
  }

  private async fetchTeacherLslPayload(teacherId: number): Promise<DataResult<TeacherLslPayload>> {
    const response = await this.fetchData(
      teacherLslUrl(teacherId, { version: this.http.version }),
    );
    if (!response.ok) return response;

    const normalized = normalizeTeacherLslResponse(response.data);
    if (!normalized.ok || !normalized.data) {
      return this.failure(
        normalized.message ?? `Unexpected teacher LSL response code ${normalized.code}`,
        true,
      );
    }

    return { ok: true, data: normalized.data };
  }

  private async ensureReadyAuth(): Promise<
    | { ok: true; accounts: AccountInfo[] }
    | DataFailure
  > {
    const current = this.auth.getState();
    const state = current.status === "session-imported" ? await this.auth.validateSession() : current;

    if (state.status === "authenticated") {
      return { ok: true, accounts: state.accounts };
    }

    return authFailure(state);
  }

  private async ensureStudentSelection(
    studentId?: number,
    accountId?: number,
  ): Promise<DataResult<{ account: AccountInfo; student: StudentInfo }>> {
    const authState = await this.ensureReadyAuth();
    if (!authState.ok) return authState;

    const selection = this.resolveStudent(authState.accounts, studentId, accountId);
    if (!selection.ok) return selection;

    const context = await this.ensureAccountContext(selection.data.account.id);
    if (!context.ok) return context;

    return this.resolveStudent(context.data.accounts, selection.data.student.id, selection.data.account.id);
  }

  private async ensureFamilySelection(accountId?: number): Promise<DataResult<AccountInfo>> {
    const authState = await this.ensureReadyAuth();
    if (!authState.ok) return authState;

    if (authState.accounts.length === 0) {
      return this.failure(
        "Authenticated session has no account metadata. Re-authenticate or import a session that includes accounts.",
        false,
      );
    }

    const family = this.resolveFamily(authState.accounts, accountId);
    if (!family.ok) return family;

    const context = await this.ensureAccountContext(family.data.id);
    if (!context.ok) return context;
    return { ok: true, data: context.data.account };
  }

  private async ensureTeacherSelection(accountId?: number): Promise<DataResult<AccountInfo>> {
    const authState = await this.ensureReadyAuth();
    if (!authState.ok) return authState;

    if (authState.accounts.length === 0) {
      return this.failure(
        "Authenticated session has no account metadata. Re-authenticate or import a session that includes accounts.",
        false,
      );
    }

    const teacher = this.resolveTeacher(authState.accounts, accountId);
    if (!teacher.ok) return teacher;

    const context = await this.ensureAccountContext(teacher.data.id);
    if (!context.ok) return context;
    return { ok: true, data: context.data.account };
  }

  private async ensureAccountContext(
    accountId: number,
  ): Promise<DataResult<{ accounts: AccountInfo[]; account: AccountInfo }>> {
    const switched = await this.auth.switchAccount(accountId);
    if (switched.status !== "authenticated") {
      return authFailure(switched);
    }

    const account = switched.accounts.find((candidate) => candidate.id === accountId);
    if (account) {
      return { ok: true, data: { accounts: switched.accounts, account } };
    }

    return this.failure(
      `Unknown accountId ${accountId}.`,
      true,
      { availableFamilies: switched.accounts.map((candidate) => summarizeFamily(candidate)) },
    );
  }

  private async fetchData(
    url: string,
    body: Record<string, unknown> = {},
  ): Promise<DataResult<RawApiResponse>> {
    try {
      const first = await this.post(url, body);
      if (requiresSessionRefresh(first)) {
        const refreshed = await this.auth.validateSession();
        if (refreshed.status !== "authenticated") {
          return authFailure(refreshed);
        }

        const retry = await this.post(url, body);
        if (retry.code === ApiCode.OK) {
          return { ok: true, data: retry };
        }
        return this.failure(retry.message || `Unexpected code ${retry.code}`, true);
      }

      if (first.code !== ApiCode.OK) {
        return this.failure(first.message || `Unexpected code ${first.code}`, true);
      }

      return { ok: true, data: first };
    } catch (error) {
      return this.failure(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  private async post(url: string, body: Record<string, unknown>): Promise<RawApiResponse> {
    const response = await this.http.postForm(url, body, { includeGtk: false });
    this.http.captureAuthHeaders(response);
    return (await response.json()) as RawApiResponse;
  }

  private resolveFamily(accounts: AccountInfo[], accountId?: number): DataResult<AccountInfo> {
    if (accountId !== undefined) {
      const selected = accounts.find((account) => account.id === accountId);
      if (selected) return { ok: true, data: selected };
      return this.failure(
        `Unknown accountId ${accountId}.`,
        true,
        { availableFamilies: accounts.map((account) => summarizeFamily(account)) },
      );
    }

    if (accounts.length === 1) return { ok: true, data: accounts[0] };

  const current = accounts.filter((account) => account.current === true);
  if (current.length === 1) return { ok: true, data: current[0] };

    const main = accounts.filter((account) => account.main === true);
    if (main.length === 1) return { ok: true, data: main[0] };

    return this.failure(
      "Multiple family accounts are available. Retry with accountId.",
      true,
      { availableFamilies: accounts.map((account) => summarizeFamily(account)) },
    );
  }

  private resolveTeacher(accounts: AccountInfo[], accountId?: number): DataResult<AccountInfo> {
    // Teacher accounts have type "P"
    const teachers = accounts.filter((account) => account.type === "P");

    if (accountId !== undefined) {
      const selected = teachers.find((account) => account.id === accountId);
      if (selected) return { ok: true, data: selected };
      // Also try all accounts in case the caller knows the exact id
      const any = accounts.find((account) => account.id === accountId);
      if (any) return { ok: true, data: any };
      return this.failure(
        `Unknown accountId ${accountId}.`,
        true,
        { availableTeachers: teachers.map((account) => summarizeTeacher(account)) },
      );
    }

    if (teachers.length === 1) return { ok: true, data: teachers[0] };
    if (teachers.length === 0) {
      return this.failure(
        "No teacher account found. Authenticate with a teacher login or import a teacher session.",
        false,
        { availableTeachers: [] },
      );
    }

    const current = teachers.filter((account) => account.current === true);
    if (current.length === 1) return { ok: true, data: current[0] };

    const main = teachers.filter((account) => account.main === true);
    if (main.length === 1) return { ok: true, data: main[0] };

    return this.failure(
      "Multiple teacher accounts are available. Retry with accountId.",
      true,
      { availableTeachers: teachers.map((account) => summarizeTeacher(account)) },
    );
  }

  private resolveStudent(
    accounts: AccountInfo[],
    studentId?: number,
    accountId?: number,
  ): DataResult<{ account: AccountInfo; student: StudentInfo }> {
    const scopedAccounts = accountId !== undefined
      ? accounts.filter((account) => account.id === accountId)
      : accounts;

    if (scopedAccounts.length === 0) {
      return this.failure(
        `Unknown accountId ${accountId}.`,
        true,
        { availableFamilies: accounts.map((account) => summarizeFamily(account)) },
      );
    }

    const candidates = scopedAccounts.flatMap((account) =>
      (account.students ?? []).map((student) => ({ account, student })),
    );

    if (candidates.length === 0) {
      return this.failure(
        "No student metadata is available for the authenticated account(s). Re-authenticate or import a session that includes accounts and students.",
        false,
        { availableFamilies: scopedAccounts.map((account) => summarizeFamily(account)) },
      );
    }

    if (studentId !== undefined) {
      const selected = candidates.find((candidate) => candidate.student.id === studentId);
      if (selected) return { ok: true, data: selected };
      return this.failure(
        `Unknown studentId ${studentId}.`,
        true,
        { availableStudents: candidates.map((candidate) => summarizeStudent(candidate.account, candidate.student)) },
      );
    }

    if (candidates.length === 1) return { ok: true, data: candidates[0] };

    if (accountId !== undefined) {
      return this.failure(
        "Multiple students are available for this family account. Retry with studentId.",
        true,
        { availableStudents: candidates.map((candidate) => summarizeStudent(candidate.account, candidate.student)) },
      );
    }

    const currentAccountCandidates = candidates.filter((candidate) => candidate.account.current === true);
    if (currentAccountCandidates.length === 1) {
      return { ok: true, data: currentAccountCandidates[0] };
    }

    if (currentAccountCandidates.length > 1) {
      return this.failure(
        "Multiple students are available for the current family account. Retry with studentId.",
        true,
        { availableStudents: currentAccountCandidates.map((candidate) => summarizeStudent(candidate.account, candidate.student)) },
      );
    }

    const mainAccountCandidates = candidates.filter((candidate) => candidate.account.main === true);
    if (mainAccountCandidates.length === 1) {
      return { ok: true, data: mainAccountCandidates[0] };
    }

    return this.failure(
      "Multiple students are available. Retry with studentId or accountId.",
      true,
      { availableStudents: candidates.map((candidate) => summarizeStudent(candidate.account, candidate.student)) },
    );
  }

  private resolveClass(student: StudentInfo): DataResult<ClassChoice> {
    if (student.classId === undefined) {
      return this.failure(
        "No class metadata is available for the selected student. Re-authenticate or import a session that includes class information.",
        false,
      );
    }

    return {
      ok: true,
      data: {
        id: student.classId,
        ...(student.className ? { name: student.className } : {}),
        ...(student.classCode ? { code: student.classCode } : {}),
      },
    };
  }

  private failure(
    error: string,
    recoverable: boolean,
    extras: Partial<Omit<DataFailure, "ok" | "error" | "recoverable">> = {},
  ): DataFailure {
    return { ok: false, error, recoverable, ...extras };
  }
}

function authFailure(state: AuthState): DataFailure {
  switch (state.status) {
    case "authenticated":
      return { ok: false, error: "Unexpected authenticated state failure", recoverable: true };
    case "logged-out":
      return {
        ok: false,
        error: "Not authenticated. Use login or import_session first.",
        recoverable: true,
      };
    case "login-pending":
      return {
        ok: false,
        error: "Login is already in progress. Finish the current authentication flow first.",
        recoverable: true,
      };
    case "totp-required":
      return {
        ok: false,
        error: "Two-factor authentication is pending. Use submit_totp before requesting data.",
        recoverable: true,
      };
    case "doubleauth-required":
      return {
        ok: false,
        error: "Identity verification is pending. Use submit_doubleauth before requesting data.",
        recoverable: true,
      };
    case "session-imported":
      return {
        ok: false,
        error: "Imported session is not validated yet. Run validate_session and retry.",
        recoverable: true,
      };
    case "error":
      return {
        ok: false,
        error: state.message,
        recoverable: state.recoverable,
      };
  }
}

function requiresSessionRefresh(raw: RawApiResponse): boolean {
  const message = typeof raw.message === "string" ? raw.message.toLowerCase() : "";
  return raw.code === ApiCode.EXPIRED_KEY || message.includes("token invalide") || message.includes("session expir");
}

function normalizeMessagesYear(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : inferCurrentAcademicYear(new Date());
}

function inferCurrentAcademicYear(now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function attachmentsForKind(
  subject: StudentCahierDeTextesDayResult["subjects"][number],
  kind: StudentCahierDeTextesAttachmentKind,
): CahierDeTextesAttachment[] {
  switch (kind) {
    case "homework-resource":
      return subject.homework?.resourceDocuments ?? [];
    case "homework-document":
      return subject.homework?.documents ?? [];
    case "homework-submitted":
      return subject.homework?.submittedDocuments ?? [];
    case "lesson-document":
      return subject.lessonContent?.documents ?? [];
  }
}

function resolveAttachmentUrl(value: string): string {
  return new URL(value, "https://www.ecoledirecte.com").toString();
}

function resolveAttachmentDownloadUrl(
  attachment: CahierDeTextesAttachment,
  version: string,
): string | undefined {
  if (attachment.url) return resolveAttachmentUrl(attachment.url);

  const downloadId = attachment.downloadId ?? (attachment.id !== undefined ? String(attachment.id) : undefined);
  if (!downloadId) return undefined;

  return telechargementUrl({
    fileId: downloadId,
    fileType: resolveAttachmentDownloadType(attachment),
    ...(attachment.cToken ? { cToken: attachment.cToken } : {}),
    version,
  });
}

function resolveAttachmentDownloadType(attachment: CahierDeTextesAttachment): string {
  const explicitType = normalizeAttachmentDownloadType(attachment.type);
  if (explicitType) return explicitType;
  if (attachment.cToken) return "IMPORT_FTP";
  return "FICHIER_CDT";
}

function normalizeAttachmentDownloadType(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^[A-Za-z0-9_]+$/.test(trimmed) ? trimmed.toUpperCase() : undefined;
}

function inferFileNameFromUrl(value: string): string | undefined {
  try {
    const pathname = new URL(value).pathname;
    const rawName = pathname.split("/").filter(Boolean).pop();
    return rawName ? decodeURIComponent(rawName) : undefined;
  } catch {
    return undefined;
  }
}

function fileNameFromDisposition(value: string | null): string | undefined {
  if (!value) return undefined;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const simpleMatch = /filename="?([^";]+)"?/i.exec(value);
  return simpleMatch?.[1] ? simpleMatch[1] : undefined;
}

function summarizeFamily(account: AccountInfo): FamilyChoice {
  return {
    id: account.id,
    name: account.name,
    ...(account.establishment ? { establishment: account.establishment } : {}),
    ...(account.main !== undefined ? { main: account.main } : {}),
    ...(account.current !== undefined ? { current: account.current } : {}),
  };
}

function summarizeStudent(account: AccountInfo, student: StudentInfo): StudentChoice {
  return {
    id: student.id,
    name: student.name,
    ...(student.classId !== undefined ? { classId: student.classId } : {}),
    ...(student.className ? { className: student.className } : {}),
    ...(student.classCode ? { classCode: student.classCode } : {}),
    ...(student.establishment ? { establishment: student.establishment } : {}),
    accountId: account.id,
    accountName: account.name,
  };
}

function summarizeTeacher(account: AccountInfo): TeacherChoice {
  return {
    id: account.id,
    name: account.name,
    ...(account.establishment ? { establishment: account.establishment } : {}),
    ...(account.main !== undefined ? { main: account.main } : {}),
    ...(account.current !== undefined ? { current: account.current } : {}),
  };
}

function summarizeTeacherObservedStudent(profile: StudentProfilePayload): TeacherStudentChoice {
  const name = profile.fullName.trim() || [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return {
    id: profile.id,
    name: name || `student ${profile.id}`,
    ...(profile.classId !== undefined ? { classId: profile.classId } : {}),
    ...(profile.classLabel ? { className: profile.classLabel } : {}),
  };
}

function summarizeTeacherAttendanceTarget(
  account: AccountInfo,
  entityId: number,
  entityType: TeacherGradebookEntityType,
  fallback?: { code?: string; label?: string },
): TeacherAttendanceTarget {
  if (entityType === "G") {
    const group = account.groups?.find((candidate) => candidate.id === entityId);
    return {
      id: entityId,
      entityType,
      ...(group?.code ? { code: group.code } : fallback?.code ? { code: fallback.code } : {}),
      ...(group?.label ? { label: group.label } : fallback?.label ? { label: fallback.label } : {}),
      ...(group?.classId !== undefined ? { classId: group.classId } : {}),
      ...(group?.subjectCode ? { subjectCode: group.subjectCode } : {}),
    };
  }

  const teacherClass = account.classes?.find((candidate) => candidate.id === entityId);
  return {
    id: entityId,
    entityType,
    ...(teacherClass?.code ? { code: teacherClass.code } : fallback?.code ? { code: fallback.code } : {}),
    ...(teacherClass?.label ? { label: teacherClass.label } : fallback?.label ? { label: fallback.label } : {}),
  };
}

function summarizeTeacherGradebookTarget(
  account: AccountInfo,
  entityId: number,
  entityType: TeacherGradebookEntityType,
): TeacherGradebookTarget {
  return summarizeTeacherAttendanceTarget(account, entityId, entityType);
}

function summarizeTeacherGradebookSubject(
  account: AccountInfo,
  subjectCode: string,
  subSubjectCode?: string,
): TeacherGradebookSubject {
  const rawCode = subjectCode.trim();
  const baseCode = rawCode.includes("¤") ? rawCode.split("¤", 1)[0] : rawCode;
  const trimmedSubSubject = subSubjectCode?.trim();
  const subject = account.subjects?.find((candidate) => candidate.code === baseCode);

  return {
    code: baseCode,
    routeCode: teacherGradebookSubjectRouteCode(rawCode, trimmedSubSubject),
    ...(subject?.label ? { label: subject.label } : {}),
    ...(trimmedSubSubject ? { subSubjectCode: trimmedSubSubject } : {}),
  };
}

function reconcileTeacherCatalogPayload(
  account: AccountInfo,
  catalog: TeacherGradebookCatalogPayload,
): TeacherGradebookCatalogPayload {
  return {
    establishments: catalog.establishments.map((establishment) => reconcileCatalogEstablishment(account, establishment)),
    attendanceGrid: dedupeAttendanceSlots(catalog.attendanceGrid),
  };
}

function reconcileCatalogEstablishment(
  account: AccountInfo,
  establishment: CatalogEstablishment,
): CatalogEstablishment {
  return {
    ...establishment,
    classes: establishment.classes.map((teacherClass) => reconcileCatalogClass(account, teacherClass)),
  };
}

function reconcileCatalogClass(account: AccountInfo, teacherClass: CatalogClass): CatalogClass {
  const metadata = resolveCatalogClassMetadata(account, teacherClass);

  return {
    ...teacherClass,
    id: metadata?.id ?? teacherClass.id,
    ...(metadata?.code ? { code: metadata.code } : {}),
    ...(metadata?.label ? { label: metadata.label } : {}),
    isPP: isCatalogClassPrincipalProfessorForTeacher(account, teacherClass),
  };
}

function resolveCatalogClassMetadata(account: AccountInfo, teacherClass: CatalogClass) {
  const metadataClasses = account.classes ?? [];
  if (teacherClass.id > 0) {
    const byId = metadataClasses.find((candidate) => candidate.id === teacherClass.id);
    if (byId) return byId;
  }

  const classCode = normalizeCatalogLookupValue(teacherClass.code);
  if (classCode) {
    const byCode = metadataClasses.find((candidate) => normalizeCatalogLookupValue(candidate.code) === classCode);
    if (byCode) return byCode;
  }

  const classLabel = normalizeCatalogLookupValue(teacherClass.label);
  if (classLabel) {
    const byLabel = metadataClasses.find((candidate) => normalizeCatalogLookupValue(candidate.label) === classLabel);
    if (byLabel) return byLabel;
  }

  return undefined;
}

function isCatalogClassPrincipalProfessorForTeacher(account: AccountInfo, teacherClass: CatalogClass): boolean {
  const principalProfessorIds = teacherClass.principalProfessorIds ?? [];
  if (principalProfessorIds.length > 0) {
    return principalProfessorIds.includes(account.id);
  }
  return teacherClass.isPP;
}

function normalizeCatalogLookupValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function dedupeAttendanceSlots(slots: CatalogAttendanceSlot[]): CatalogAttendanceSlot[] {
  const deduped: CatalogAttendanceSlot[] = [];
  const seen = new Set<string>();

  for (const slot of slots) {
    const key = `${slot.start}-${slot.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(slot);
  }

  return deduped;
}

function mergeTeacherAttendanceTargets(
  primary: TeacherAttendanceTarget[],
  secondary: TeacherAttendanceTarget[],
): TeacherAttendanceTarget[] {
  const merged = new Map<number, TeacherAttendanceTarget>();

  for (const candidate of [...primary, ...secondary]) {
    const previous = merged.get(candidate.id);
    merged.set(candidate.id, {
      ...(previous ?? {}),
      ...candidate,
      id: candidate.id,
      entityType: candidate.entityType,
      ...(previous?.code && !candidate.code ? { code: previous.code } : {}),
      ...(previous?.label && !candidate.label ? { label: previous.label } : {}),
      ...(previous?.classId !== undefined && candidate.classId === undefined ? { classId: previous.classId } : {}),
      ...(previous?.subjectCode && !candidate.subjectCode ? { subjectCode: previous.subjectCode } : {}),
    });
  }

  return [...merged.values()].sort((left, right) => {
    const leftLabel = left.label ?? left.code ?? `${left.id}`;
    const rightLabel = right.label ?? right.code ?? `${right.id}`;
    return leftLabel.localeCompare(rightLabel, "fr", { sensitivity: "base" });
  });
}

function buildTeacherCouncilTargets(
  account: AccountInfo,
  catalog: TeacherGradebookCatalogPayload,
): TeacherCouncilTarget[] {
  const metadataClasses = new Map((account.classes ?? []).map((teacherClass) => [teacherClass.id, teacherClass]));
  const targets = new Map<number, TeacherCouncilTarget>();

  for (const teacherClass of catalog.establishments.flatMap((establishment) => establishment.classes)) {
    if (!isCatalogClassPrincipalProfessorForTeacher(account, teacherClass)) continue;

    const metadata = metadataClasses.get(teacherClass.id);
    const previous = targets.get(teacherClass.id);
    targets.set(teacherClass.id, {
      id: teacherClass.id,
      entityType: "C",
      ...(metadata?.code ? { code: metadata.code } : teacherClass.code ? { code: teacherClass.code } : {}),
      ...(metadata?.label ? { label: metadata.label } : teacherClass.label ? { label: teacherClass.label } : {}),
      isPP: true,
      periods: mergeTeacherCouncilPeriods(
        previous?.periods ?? [],
        teacherClass.periods.map((period) => summarizeTeacherCouncilPeriod(period)),
      ),
    });
  }

  return [...targets.values()].sort((left, right) => {
    const leftLabel = left.label ?? left.code ?? `${left.id}`;
    const rightLabel = right.label ?? right.code ?? `${right.id}`;
    return leftLabel.localeCompare(rightLabel, "fr", { sensitivity: "base" });
  });
}

function summarizeTeacherCouncilPeriod(period: CatalogPeriod): TeacherCouncilPeriod {
  return {
    code: period.code,
    ...(period.label ? { label: period.label } : {}),
    ...(period.shortLabel ? { shortLabel: period.shortLabel } : {}),
    ...(period.state ? { state: period.state } : {}),
    ...(period.councilDate ? { councilDate: period.councilDate } : {}),
    ...(period.startDate ? { startDate: period.startDate } : {}),
    ...(period.endDate ? { endDate: period.endDate } : {}),
    appreciationOpen: period.appreciationOpen,
    classAppreciationOpen: period.classAppreciationOpen,
  };
}

function summarizeTeacherCouncilTarget(target: TeacherCouncilTarget): TeacherCouncilTargetSummary {
  return {
    id: target.id,
    entityType: target.entityType,
    ...(target.code ? { code: target.code } : {}),
    ...(target.label ? { label: target.label } : {}),
    isPP: target.isPP,
  };
}

function mergeTeacherCouncilPeriods(
  primary: TeacherCouncilPeriod[],
  secondary: TeacherCouncilPeriod[],
): TeacherCouncilPeriod[] {
  const merged = new Map<string, TeacherCouncilPeriod>();

  for (const period of [...primary, ...secondary]) {
    const previous = merged.get(period.code);
    merged.set(period.code, {
      ...(previous ?? {}),
      ...period,
      code: period.code,
      appreciationOpen: (previous?.appreciationOpen ?? false) || period.appreciationOpen,
      classAppreciationOpen: (previous?.classAppreciationOpen ?? false) || period.classAppreciationOpen,
    });
  }

  return [...merged.values()];
}

function summarizeTeacherLslClass(classEntry: TeacherLslPayload["classes"][number]): TeacherLslClassSummary {
  return {
    id: classEntry.id,
    label: classEntry.label,
    principalProfessor: classEntry.principalProfessor,
    isTerminalClass: classEntry.isTerminalClass,
    isGeneralOrTechno: classEntry.isGeneralOrTechno,
    isTechno: classEntry.isTechno,
    isProfessional: classEntry.isProfessional,
    studentCount: classEntry.studentCount,
    subjectCount: classEntry.subjectCount,
    students: classEntry.students.map((student) => ({
      id: student.id,
      name: student.name,
      ...(student.arrivalOrder ? { arrivalOrder: student.arrivalOrder } : {}),
      ...(student.gender ? { gender: student.gender } : {}),
      subjectCount: student.subjectCount,
    })),
    subjects: classEntry.subjects,
  };
}

function summarizeTeacherLslClassContext(classEntry: TeacherLslPayload["classes"][number]): TeacherLslClassContext {
  return {
    id: classEntry.id,
    label: classEntry.label,
    principalProfessor: classEntry.principalProfessor,
    isTerminalClass: classEntry.isTerminalClass,
    isGeneralOrTechno: classEntry.isGeneralOrTechno,
    isTechno: classEntry.isTechno,
    isProfessional: classEntry.isProfessional,
    studentCount: classEntry.studentCount,
    subjectCount: classEntry.subjectCount,
    subjects: classEntry.subjects,
  };
}

function normalizeIsoDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function normalizeAttendanceTime(value: string): string | undefined {
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : undefined;
}