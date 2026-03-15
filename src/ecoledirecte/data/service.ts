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
  normalizeFamilyDocumentsResponse,
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

export interface FamilyInvoicesQuery {
  accountId?: number;
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

export interface DataFailure {
  ok: false;
  error: string;
  recoverable: boolean;
  availableFamilies?: FamilyChoice[];
  availableStudents?: StudentChoice[];
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

export interface FamilyInvoicesResult extends FamilyInvoicesPayload {
  scope: "family";
  family: FamilyChoice;
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