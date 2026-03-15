import { describe, expect, it, vi } from "vitest";
import { EdDataService } from "../../src/ecoledirecte/data/service.js";
import type { AuthState } from "../../src/ecoledirecte/auth/types.js";
import type { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";

function makeResponse(body: RawApiResponse): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

function makeDownloadResponse(
  body: Uint8Array | string,
  init: { headers?: Record<string, string>; status?: number } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

function makeHttp(responses: RawApiResponse[], downloadResponses: Response[] = []): EdHttpClient {
  let index = 0;
  let downloadIndex = 0;
  return {
    version: "4.96.3",
    postForm: vi.fn().mockImplementation(() => Promise.resolve(makeResponse(responses[index++] ?? responses[responses.length - 1]))),
    get: vi.fn().mockImplementation(() => Promise.resolve(
      downloadResponses[downloadIndex++]
        ?? downloadResponses[downloadResponses.length - 1]
        ?? makeDownloadResponse("", { status: 404 }),
    )),
    captureAuthHeaders: vi.fn(),
  } as unknown as EdHttpClient;
}

function makeAuth(state: AuthState, validatedState: AuthState = state) {
  return {
    getState: vi.fn().mockReturnValue(state),
    validateSession: vi.fn().mockResolvedValue(validatedState),
    switchAccount: vi.fn().mockImplementation((accountId: number) => {
      if (validatedState.status !== "authenticated") {
        return Promise.resolve(validatedState);
      }

      return Promise.resolve({
        ...validatedState,
        accounts: validatedState.accounts.map((account) => ({
          ...account,
          current: account.id === accountId,
        })),
      } satisfies AuthState);
    }),
  };
}

const authenticatedState: AuthState = {
  status: "authenticated",
  token: "tok",
  accounts: [
    {
      id: 828,
      idLogin: 4229759,
      type: "1",
      name: "Anne Roudier-Boivin",
      establishment: "Les Marronniers",
      main: true,
      current: true,
      students: [{ id: 1154, name: "Antonin Boivin", classId: 18, className: "3B", classCode: "3B" }],
    },
    {
      id: 17405,
      idLogin: 8955929,
      type: "1",
      name: "Anne Roudier-Boivin",
      establishment: "Institution Robin",
      current: false,
      students: [{ id: 15902, name: "Jules Boivin", classId: 165, className: "Première 2", classCode: "12" }],
    },
  ],
};

const messagesBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    classeurs: [{ id: 1, libelle: "Parents" }],
    parametrage: { isActif: "1", canParentsLireMessagesEnfants: "1", destProf: "1" },
    pagination: { messagesRecusCount: 1, messagesRecusNotReadCount: 0 },
    messages: {
      received: [
        {
          id: 1,
          read: true,
          subject: "Bienvenue",
          idClasseur: 0,
          idDossier: -1,
          from: { civilite: "Mme", prenom: "Anne", nom: "Prof" },
          to: [{ prenom: "Antonin", nom: "Boivin" }],
          files: [],
        },
      ],
    },
  },
};

const familyMessageDetailBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    id: 18213,
    responseId: 0,
    forwardId: 0,
    mtype: "received",
    read: true,
    idDossier: -1,
    idClasseur: 0,
    transferred: false,
    answered: false,
    brouillon: false,
    canAnswer: true,
    subject: "Re rappel.",
    content: "PGRpdj5Cb25qb3VyPC9kaXY+",
    date: "2026-03-11 06:12:59",
    to: [],
    files: [{ id: 9, libelle: "convocation.pdf", unc: "file-9" }],
    from: {
      nom: "JOSEPH",
      prenom: "C.",
      particule: "",
      civilite: "Mme",
      role: "P",
      id: 16,
      read: true,
      fonctionPersonnel: "",
    },
  },
};

const notesBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    parametrage: { moyenneEleve: true },
    periodes: [{ idPeriode: "P1", codePeriode: "A001", periode: "Trimestre 1", annuel: false, cloture: true, examenBlanc: false }],
    notes: [
      {
        id: 7,
        devoir: "Contrôle",
        libelleMatiere: "Mathématiques",
        codePeriode: "A001",
        enLettre: false,
        valeurisee: false,
        nonSignificatif: false,
        elementsProgramme: [],
      },
    ],
  },
};

const studentProfileBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    id: 1154,
    nom: "BOIVIN",
    particule: "",
    prenom: "Antonin",
    sexe: "M",
    regime: "Demi-pensionnaire",
    dateDeNaissance: "2011-11-06",
    email: "anne.roudier@free.fr",
    mobile: "0671561833",
    isPrimaire: false,
    isPP: false,
    photo: "//doc1.ecoledirecte.com/PhotoEleves/demo.jpg",
    classeId: 18,
    classeLibelle: "3B",
    classeEstNote: 1,
    idEtablissement: 1,
  },
};

const secondStudentProfileBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    id: 15902,
    nom: "BOIVIN",
    particule: "",
    prenom: "Jules",
    sexe: "M",
    regime: "Externe libre",
    dateDeNaissance: "2009-04-10",
    email: "anne.roudier@free.fr",
    mobile: "0671561833",
    isPrimaire: false,
    isPP: false,
    photo: "//doc1.ecoledirecte.com/PhotoEleves/jules.jpg",
    classeId: 165,
    classeLibelle: "Première 2",
    classeEstNote: 1,
    idEtablissement: 27,
  },
};

const cahierDeTextesBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    "2026-03-12": [
      {
        idDevoir: 12,
        matiere: "Mathématiques",
        codeMatiere: "MATH",
        aFaire: "1",
        documentsAFaire: "0",
        effectue: "0",
        interrogation: "1",
        rendreEnLigne: "0",
        donneLe: "2026-03-10",
        tags: ["Quiz"],
      },
    ],
    "2026-03-13": [],
  },
};

const cahierDeTextesDayBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    date: "2026-03-12",
    matieres: [
      {
        matiere: "ESPAGNOL LV2",
        codeMatiere: "ESP2",
        nomProf: "Mme LADAVIERE V.",
        id: 4579,
        interrogation: false,
        blogActif: false,
        nbJourMaxRenduDevoir: 0,
        aFaire: {
          idDevoir: 4579,
          contenu: "PHA+RGV2b2lyPC9wPg==",
          rendreEnLigne: false,
          donneLe: "2026-03-02",
          effectue: true,
          ressource: "",
          documentsRendusDeposes: false,
          ressourceDocuments: [],
          documents: [],
          elementsProg: [],
          liensManuel: [],
          documentsRendus: [],
          tags: [],
          cdtPersonnalises: [],
        },
        contenuDeSeance: {
          idDevoir: 4579,
          contenu: "PHA+Q291cnM8L3A+",
          documents: [],
          elementsProg: [],
          liensManuel: [],
        },
      },
    ],
  },
};

const cahierDeTextesDayWithAttachmentsBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    date: "2026-03-12",
    matieres: [
      {
        matiere: "ESPAGNOL LV2",
        codeMatiere: "ESP2",
        nomProf: "Mme LADAVIERE V.",
        id: 4579,
        interrogation: false,
        blogActif: false,
        nbJourMaxRenduDevoir: 0,
        aFaire: {
          idDevoir: 4579,
          contenu: "PHA+RGV2b2lyPC9wPg==",
          rendreEnLigne: false,
          donneLe: "2026-03-02",
          effectue: true,
          ressource: "",
          documentsRendusDeposes: false,
          ressourceDocuments: [{ libelle: "audio.mp3", url: "//doc1.ecoledirecte.com/audio.mp3", type: "audio/mpeg" }],
          documents: [
            { libelle: "Lexique.pdf", urlFichier: "https://doc1.ecoledirecte.com/lexique.pdf", unc: "unc-lexique" },
            { fichierId: 2489, leTypeDeFichier: "FICHIER_CDT", libelle: "BILAN TrimII.docx" },
          ],
          elementsProg: [],
          liensManuel: [],
          documentsRendus: [{ libelle: "Rendu.txt", urlFichier: "/piecejointe/rendu.txt" }],
          tags: [],
          cdtPersonnalises: [],
        },
        contenuDeSeance: {
          idDevoir: 4579,
          contenu: "PHA+Q291cnM8L3A+",
          documents: [{ libelle: "Cours.pdf", href: "https://doc1.ecoledirecte.com/cours.pdf" }],
          elementsProg: [],
          liensManuel: [],
        },
      },
    ],
  },
};

const vieScolaireBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    absencesRetards: [
      {
        id: 1,
        idEleve: 1154,
        typeElement: "absence",
        date: "2026-03-02",
        motif: "Medical",
        justifie: "1",
      },
    ],
    dispenses: [{ id: 2, idEleve: 1154, matiere: "Sport", presence: "0" }],
    sanctionsEncouragements: [{ id: 3, idEleve: 1154, libelle: "Encouragements", par: "Conseil" }],
    permisPoint: { points: 12 },
    parametrage: { justificationEnLigne: "1", sanctionsVisible: "1" },
  },
};

const carnetCorrespondanceBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    correspondances: [
      {
        idEleve: 1154,
        prenom: "Antonin",
        nom: "Boivin",
        dateCreation: "2026-03-01",
        contenu: "Signature demandée",
        type: "Observation",
        isSignatureDemandee: "1",
        auteur: { id: 9, role: "professeur", prenom: "Marie", nom: "Durand" },
      },
    ],
    suivis: [{ id: 99, status: "open" }],
  },
};

const sessionsRdvBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    sessions: [{ id: 1, title: "Parents-professeurs" }],
    auteurs: [{ id: 2, nom: "Durand" }],
    invites: [{ id: 3, nom: "Boivin" }],
    indisposInvites: [{ id: 4, nom: "Absent" }],
  },
};

const vieDeLaClasseBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    conseil: { date: "2026-03-20" },
  },
};

const emploiDuTempsBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: [
    {
      id: 40,
      text: "Mathématiques",
      matiere: "Mathématiques",
      codeMatiere: "MATH",
      start_date: "2026-03-12 08:00",
      end_date: "2026-03-12 09:00",
      dispensable: "1",
      dispense: "0",
      isFlexible: "0",
      isModifie: "0",
      contenuDeSeance: "1",
      devoirAFaire: "1",
      isAnnule: "0",
    },
    {
      id: 41,
      text: "Français",
      matiere: "Français",
      start_date: "2026-03-13 10:00",
      end_date: "2026-03-13 11:00",
      dispensable: "0",
      dispense: "0",
      isFlexible: "0",
      isModifie: "0",
      contenuDeSeance: "0",
      devoirAFaire: "0",
      isAnnule: "0",
    },
  ],
};

const familyDocumentsBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: {
    factures: [{ id: 1, libelle: "Facture oct 2025", date: "2025-10-01", type: "facture" }],
    notes: [{ id: 2, libelle: "Bulletin T1", date: "2025-12-15", type: "note" }],
    viescolaire: [],
    administratifs: [{ id: 3, libelle: "Attestation", type: "administratif" }],
    inscriptions: [],
    entreprises: [],
    listesPiecesAVerser: [],
  },
};

const familyInvoicesBody: RawApiResponse = {
  code: ApiCode.OK,
  token: "",
  message: "",
  data: [
    { id: 10, libelle: "Facture octobre 2025", date: "2025-10-01", type: "facture", signatureDemandee: false },
    { id: 11, libelle: "Facture novembre 2025", date: "2025-11-01", type: "facture" },
  ],
};

describe("EdDataService", () => {
  it("accepts successful data responses that omit the message field", async () => {
    const responseWithoutMessage = {
      code: ApiCode.OK,
      token: "",
      data: messagesBody.data,
    } as RawApiResponse;
    const service = new EdDataService(makeHttp([responseWithoutMessage]), makeAuth(authenticatedState) as any);

    const result = await service.listStudentMessages({ studentId: 1154 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.messages).toHaveLength(1);
    }
  });

  it("uses the main family account by default for family messages", async () => {
    const http = makeHttp([messagesBody]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listFamilyMessages();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.family.id).toBe(828);
      expect(result.data.messages).toHaveLength(1);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/familles/828/messages.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("prefers the current family account over main when family selection is implicit", async () => {
    const currentState: AuthState = {
      ...authenticatedState,
      accounts: authenticatedState.accounts.map((account) => ({
        ...account,
        current: account.id === 17405,
      })),
    };
    const http = makeHttp([messagesBody]);
    const auth = makeAuth(currentState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listFamilyMessages();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.family.id).toBe(17405);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/familles/17405/messages.awp"),
      {},
      { includeGtk: false },
    );
    expect(auth.switchAccount).toHaveBeenCalledWith(17405);
  });

  it("returns full family message content for a selected message", async () => {
    const http = makeHttp([familyMessageDetailBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getFamilyMessageDetail({
      messageId: 18213,
      messagesYear: "2025-2026",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.family.id).toBe(828);
      expect(result.data.messagesYear).toBe("2025-2026");
      expect(result.data.subject).toBe("Re rappel.");
      expect(result.data.contentHtml).toBe("<div>Bonjour</div>");
      expect(result.data.from?.name).toBe("Mme C. JOSEPH");
      expect(result.data.attachmentCount).toBe(1);
      expect(result.data.attachments[0]?.name).toBe("convocation.pdf");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/familles/828/messages/18213.awp?verbe=get&mode=destinataire"),
      { anneeMessages: "2025-2026" },
      { includeGtk: false },
    );
  });

  it("returns an actionable error when the student selection is ambiguous", async () => {
    const auth: AuthState = {
      status: "authenticated",
      token: "tok",
      accounts: [
        { id: 1, type: "1", name: "Famille A", students: [{ id: 10, name: "Eleve A" }] },
        { id: 2, type: "1", name: "Famille B", students: [{ id: 20, name: "Eleve B" }] },
      ],
    };
    const service = new EdDataService(makeHttp([messagesBody]), makeAuth(auth) as any);

    const result = await service.listStudentMessages();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Multiple students");
      expect(result.availableStudents).toEqual([
        { id: 10, name: "Eleve A", accountId: 1, accountName: "Famille A" },
        { id: 20, name: "Eleve B", accountId: 2, accountName: "Famille B" },
      ]);
    }
  });

  it("filters student notes by periodCode", async () => {
    const service = new EdDataService(makeHttp([notesBody]), makeAuth(authenticatedState) as any);

    const result = await service.getStudentNotes({ periodCode: "A001" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.selectedPeriodCode).toBe("A001");
      expect(result.data.periods).toHaveLength(1);
      expect(result.data.grades).toHaveLength(1);
      expect(result.data.student.id).toBe(1154);
    }
  });

  it("posts the expected schoolYear payload for student profile", async () => {
    const http = makeHttp([studentProfileBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getStudentProfile({ studentId: 1154 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fullName).toBe("Antonin BOIVIN");
      expect(result.data.classLabel).toBe("3B");
      expect(result.data.photoUrl).toBe("https://doc1.ecoledirecte.com/PhotoEleves/demo.jpg");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/eleves/1154.awp"),
      { anneeScolaire: "" },
      { includeGtk: false },
    );
  });

  it("switches account context before requesting another family student", async () => {
    const http = makeHttp([secondStudentProfileBody]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getStudentProfile({ studentId: 15902 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.student.id).toBe(15902);
      expect(result.data.family.id).toBe(17405);
      expect(result.data.fullName).toBe("Jules BOIVIN");
    }
    expect(auth.switchAccount).toHaveBeenCalledWith(17405);
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/eleves/15902.awp"),
      { anneeScolaire: "" },
      { includeGtk: false },
    );
  });

  it("uses the current family's only student when student selection is implicit", async () => {
    const currentState: AuthState = {
      ...authenticatedState,
      accounts: authenticatedState.accounts.map((account) => ({
        ...account,
        current: account.id === 17405,
      })),
    };
    const http = makeHttp([notesBody]);
    const auth = makeAuth(currentState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getStudentNotes();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.student.id).toBe(15902);
      expect(result.data.family.id).toBe(17405);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/eleves/15902/notes.awp"),
      {},
      { includeGtk: false },
    );
    expect(auth.switchAccount).toHaveBeenCalledWith(17405);
  });

  it("retries once after validate_session when the API reports an invalid token", async () => {
    const http = makeHttp([
      { code: ApiCode.CHARTER_REQUIRED, token: "", message: "Token invalide !", data: { accounts: [] } },
      messagesBody,
    ]);
    const auth = makeAuth(authenticatedState, authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listStudentMessages({ studentId: 1154 });

    expect(result.ok).toBe(true);
    expect(auth.validateSession).toHaveBeenCalledTimes(1);
    expect(http.postForm).toHaveBeenCalledTimes(2);
  });

  it("filters cahier de textes by date", async () => {
    const http = makeHttp([cahierDeTextesBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getStudentCahierDeTextes({ studentId: 1154, date: "2026-03-12" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.selectedDate).toBe("2026-03-12");
      expect(result.data.days).toHaveLength(1);
      expect(result.data.totalAssignments).toBe(1);
      expect(result.data.days[0]?.assignments[0]?.subject).toBe("Mathématiques");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/Eleves/1154/cahierdetexte.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("returns cahier de textes day details with decoded homework content", async () => {
    const http = makeHttp([cahierDeTextesDayBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getStudentCahierDeTextesDay({ studentId: 1154, date: "2026-03-12" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.date).toBe("2026-03-12");
      expect(result.data.homeworkCount).toBe(1);
      expect(result.data.lessonContentCount).toBe(1);
      expect(result.data.subjects[0]?.homework?.html).toBe("<p>Devoir</p>");
      expect(result.data.subjects[0]?.lessonContent?.html).toBe("<p>Cours</p>");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/Eleves/1154/cahierdetexte/2026-03-12.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("downloads a selected cahier de textes attachment when a direct URL is available", async () => {
    const http = makeHttp(
      [cahierDeTextesDayWithAttachmentsBody],
      [makeDownloadResponse("PDF", {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="Lexique.pdf"',
        },
      })],
    );
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.downloadStudentCahierDeTextesAttachment({
      studentId: 1154,
      date: "2026-03-12",
      homeworkId: 4579,
      attachmentKind: "homework-document",
      attachmentIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.subject).toBe("ESPAGNOL LV2");
      expect(result.data.fileName).toBe("Lexique.pdf");
      expect(result.data.mimeType).toBe("application/pdf");
      expect(result.data.contentLength).toBe(3);
      expect(result.data.contentBase64).toBe(Buffer.from("PDF").toString("base64"));
      expect(result.data.attachment.url).toBe("https://doc1.ecoledirecte.com/lexique.pdf");
    }
    expect(http.get).toHaveBeenCalledWith(
      "https://doc1.ecoledirecte.com/lexique.pdf",
      { includeGtk: false },
    );
  });

  it("downloads a selected cahier de textes attachment through telechargement when only file identifiers are available", async () => {
    const http = makeHttp(
      [cahierDeTextesDayWithAttachmentsBody],
      [makeDownloadResponse("DOCX", {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "content-disposition": 'attachment; filename="BILAN TrimII.docx"',
        },
      })],
    );
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.downloadStudentCahierDeTextesAttachment({
      studentId: 1154,
      date: "2026-03-12",
      homeworkId: 4579,
      attachmentKind: "homework-document",
      attachmentIndex: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.subject).toBe("ESPAGNOL LV2");
      expect(result.data.fileName).toBe("BILAN TrimII.docx");
      expect(result.data.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(result.data.contentLength).toBe(4);
      expect(result.data.contentBase64).toBe(Buffer.from("DOCX").toString("base64"));
      expect(result.data.attachment.id).toBe(2489);
      expect(result.data.attachment.downloadId).toBe("2489");
      expect(result.data.attachment.type).toBe("FICHIER_CDT");
    }
    expect(http.get).toHaveBeenCalledWith(
      "https://api.ecoledirecte.com/v3/telechargement.awp?verbe=get&fichierId=2489&leTypeDeFichier=FICHIER_CDT&v=4.96.3",
      { includeGtk: false },
    );
  });

  it("returns an actionable error when the selected cahier de textes attachment is missing", async () => {
    const service = new EdDataService(makeHttp([cahierDeTextesDayBody]), makeAuth(authenticatedState) as any);

    const result = await service.downloadStudentCahierDeTextesAttachment({
      studentId: 1154,
      date: "2026-03-12",
      homeworkId: 4579,
      attachmentKind: "homework-document",
      attachmentIndex: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown attachmentIndex");
    }
  });

  it("returns normalized vie scolaire data", async () => {
    const http = makeHttp([vieScolaireBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getStudentVieScolaire({ studentId: 1154 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.absencesRetards).toHaveLength(1);
      expect(result.data.dispenses).toHaveLength(1);
      expect(result.data.sanctionsEncouragements).toHaveLength(1);
      expect(result.data.settings.justificationEnLigne).toBe(true);
      expect(result.data.student.classId).toBe(18);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/eleves/1154/viescolaire.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("returns carnet de correspondance entries", async () => {
    const http = makeHttp([carnetCorrespondanceBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.listStudentCarnetCorrespondance({ studentId: 1154 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.correspondences).toHaveLength(1);
      expect(result.data.followUps).toHaveLength(1);
      expect(result.data.correspondences[0]?.author?.name).toBe("Marie Durand");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/eleves/1154/eleveCarnetCorrespondance.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("returns sessions RDV metadata", async () => {
    const http = makeHttp([sessionsRdvBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.listStudentSessionsRdv({ studentId: 1154 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sessions).toHaveLength(1);
      expect(result.data.authors).toHaveLength(1);
      expect(result.data.invitees).toHaveLength(1);
      expect(result.data.unavailableInvitees).toHaveLength(1);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/E/1154/sessionsRdv.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("uses the student's class metadata for vie de la classe", async () => {
    const http = makeHttp([vieDeLaClasseBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getClassVieDeLaClasse({ studentId: 1154 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.class).toEqual({ id: 18, name: "3B", code: "3B" });
      expect(result.data.empty).toBe(false);
      expect(result.data.sectionKeys).toEqual(["conseil"]);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/Classes/18/viedelaclasse.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("filters emploi du temps by date", async () => {
    const http = makeHttp([emploiDuTempsBody]);
    const service = new EdDataService(http, makeAuth(authenticatedState) as any);

    const result = await service.getStudentEmploiDuTemps({ studentId: 1154, date: "2026-03-12" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.selectedDate).toBe("2026-03-12");
      expect(result.data.days).toHaveLength(1);
      expect(result.data.totalEvents).toBe(1);
      expect(result.data.days[0]?.events[0]?.subject).toBe("Mathématiques");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/E/1154/emploidutemps.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("returns family documents grouped by category", async () => {
    const http = makeHttp([familyDocumentsBody]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getFamilyDocuments();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.family.id).toBe(828);
      expect(result.data.factures).toHaveLength(1);
      expect(result.data.notes).toHaveLength(1);
      expect(result.data.administratifs).toHaveLength(1);
      expect(result.data.totalDocuments).toBe(3);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/familledocuments.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("switches account context for family documents when a different accountId is given", async () => {
    const http = makeHttp([familyDocumentsBody]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getFamilyDocuments({ accountId: 17405 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.family.id).toBe(17405);
    }
    expect(auth.switchAccount).toHaveBeenCalledWith(17405);
  });

  it("returns family invoices as a flat list", async () => {
    const http = makeHttp([familyInvoicesBody]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listFamilyInvoices();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.family.id).toBe(828);
      expect(result.data.invoices).toHaveLength(2);
      expect(result.data.invoices[0]?.libelle).toBe("Facture octobre 2025");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/factures.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("lists all students across all accounts", async () => {
    const http = makeHttp([]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listAllStudents();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe(1154);
      expect(result.data[0]?.accountId).toBe(828);
      expect(result.data[1]?.id).toBe(15902);
      expect(result.data[1]?.accountId).toBe(17405);
    }
  });
});

// ── Teacher data service tests ─────────────────────────────────

const teacherAuthState: AuthState = {
  status: "authenticated",
  token: "teacher-tok",
  accounts: [
    {
      id: 221,
      idLogin: 708430,
      type: "P",
      name: "Mme D. PROF",
      establishment: "Centre Scolaire",
      main: true,
      current: true,
      classes: [
        { id: 85, code: "3PA", label: "3ème Prépa Apprenti" },
      ],
      groups: [
        { id: 1505, code: "VICLA_TG6", label: "Vie de classe TG6", classId: 85, subjectCode: "VICLA" },
      ],
      subjects: [
        { code: "FRANC", label: "FRANCAIS" },
        { code: "VICLA", label: "VIE DE CLASSE" },
      ],
    },
  ],
};

describe("teacher gradebook catalog", () => {
  it("lists teacher attendance targets with suggested slots", async () => {
    const catalogBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: [
        {
          id: 6,
          code: "LP",
          nom: "Lycée Pro",
          parametres: {
            grille: [
              { heureDbt: "08:00", heureFin: "08:55" },
              { heureDbt: "09:00", heureFin: "09:55" },
            ],
          },
          niveaux: [
            {
              classes: [{
                idGroupe: 85,
                code: "3PA",
                libelle: "3ème Prépa Apprenti",
                typeEntity: "C",
                tabPP: [{ idPP: 221 }],
                periodes: [],
              }],
              groupes: [{
                idGroupe: 1505,
                code: "VICLA_TG6",
                libelle: "Vie de classe TG6",
                typeEntity: "G",
                periodes: [],
              }],
            },
          ],
        },
      ],
    };

    const http = makeHttp([catalogBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listTeacherAttendanceTargets();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.classes).toEqual([
        { id: 85, entityType: "C", code: "3PA", label: "3ème Prépa Apprenti" },
      ]);
      expect(result.data.groups).toEqual([
        {
          id: 1505,
          entityType: "G",
          code: "VICLA_TG6",
          label: "Vie de classe TG6",
          classId: 85,
          subjectCode: "VICLA",
        },
      ]);
      expect(result.data.suggestedSlots).toEqual([
        { start: "08:00", end: "08:55" },
        { start: "09:00", end: "09:55" },
      ]);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/niveauxListe.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("fetches a teacher attendance roster for a group and time window", async () => {
    const attendanceBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        eleves: [
          {
            id: 4017,
            prenom: "Loélie",
            nom: "AZEVEDO",
            sexe: "F",
            classeId: 74,
            groupeId: 1505,
            classeLibelle: "Terminale C",
            dateEntree: "2019-09-02",
            dateSortie: "",
            numeroBadge: "50170",
            regime: "Externe",
            email: "loelie47@gmail.com",
            portable: "",
            photo: "//photo.jpg",
            dateNaissance: "2008-12-15",
            estEnStage: true,
            estApprenant: false,
            dispense: false,
            finDispense: "",
            presenceObligatoire: true,
            absentAvant: false,
            dispositifs: [],
          },
        ],
        entity: {
          id: 1505,
          code: "VICLA_TG6",
          libelle: "VICLA_TG6",
          type: "G",
          isFlexible: false,
          isPrimaire: false,
        },
        appelEnClasse: {
          effectue: false,
          dateHeure: "",
        },
      },
    };

    const http = makeHttp([attendanceBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherAttendanceRoster({
      entityId: 1505,
      entityType: "G",
      startTime: "13:25",
      endTime: "14:20",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.target).toEqual({
        id: 1505,
        entityType: "G",
        code: "VICLA_TG6",
        label: "Vie de classe TG6",
        classId: 85,
        subjectCode: "VICLA",
      });
      expect(result.data.selectedSlot).toEqual({ start: "13:25", end: "14:20" });
      expect(result.data.studentCount).toBe(1);
      expect(result.data.attendanceCall.completed).toBe(false);
      expect(result.data.students[0]?.inStage).toBe(true);
      expect(result.data.students[0]?.className).toBe("Terminale C");
    }

    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/groupes/1505/eleves.awp"),
      { heureDebut: "13:25", heureFin: "14:20" },
      { includeGtk: false },
    );
  });

  it("fetches and normalizes the gradebook catalog", async () => {
    const catalogBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: [
        {
          id: 6,
          code: "LP",
          nom: "Lycée Pro",
          parametres: {
            grille: [{ heureDbt: "08:00", heureFin: "08:55" }],
          },
          niveaux: [
            {
              classes: [{
                idGroupe: 85,
                code: "3PA",
                libelle: "3ème Prépa Apprenti",
                typeEntity: "C",
                tabPP: [{ idPP: 221 }],
                periodes: [{
                  codePeriode: "A001",
                  libelle: "Trimestre 1",
                  dateConseil: "2025-12-05",
                  saisieAppreciation: true,
                  matieres: [
                    { code: "FRANC", libelle: "Français", avecNotation: true, isEditable: true },
                  ],
                }],
              }],
              groupes: [],
            },
          ],
        },
      ],
    };

    const http = makeHttp([catalogBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherGradebookCatalog();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.establishments).toHaveLength(1);
      expect(result.data.establishments[0].classes).toHaveLength(1);
      expect(result.data.establishments[0].classes[0].id).toBe(85);
      expect(result.data.establishments[0].classes[0].isPP).toBe(true);
      expect(result.data.establishments[0].classes[0].periods[0].subjects[0].code).toBe("FRANC");
      expect(result.data.attendanceGrid).toHaveLength(1);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/niveauxListe.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("supports the nested live niveauxListe shape", async () => {
    const catalogBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        etablissements: [
          {
            id: 6,
            code: "LP",
            libelle: "Lycée Pro",
            parametres: {
              grille: [{ heureDbt: "08:00", heureFin: "08:55" }],
            },
            niveaux: [
              {
                id: 1,
                code: "TERM",
                libelle: "Terminale",
                classes: [
                  {
                    id: 85,
                    idGroupe: 85,
                    code: "3PA",
                    libelle: "3ème Prépa Apprenti",
                    isPP: true,
                    periodes: [
                      {
                        codePeriode: "A003",
                        libelle: "Trimestre 3",
                        libelleCourt: "T3",
                        etat: "ouvert",
                        saisieAppreciation: true,
                        saisieAppreciationClasse: true,
                        dateDebut: "2026-02-23",
                        dateFin: "2026-05-30",
                        dateConseil: "2026-05-31",
                        matieres: [
                          { code: "FRANC", libelle: "Français", libelleCourt: "FR", avecNotation: true, isEditable: "Si non vide" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        groupes: [
          {
            id: 1505,
            etabId: 6,
            code: "VICLA_TG6",
            libelle: "Vie de classe TG6",
            periodes: [
              {
                codePeriode: "A003",
                libelle: "Trimestre 3",
                etat: "ouvert",
                saisieAppreciation: true,
                saisieAppreciationClasse: true,
                matieres: [],
              },
            ],
          },
        ],
        autresGroupes: [],
      },
    };

    const http = makeHttp([catalogBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherGradebookCatalog();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.establishments[0]?.classes[0]?.periods[0]).toMatchObject({
        code: "A003",
        shortLabel: "T3",
        state: "ouvert",
        classAppreciationOpen: true,
      });
      expect(result.data.establishments[0]?.groups[0]?.id).toBe(1505);
      expect(result.data.establishments[0]?.groups[0]?.periods[0]?.state).toBe("ouvert");
    }
  });

  it("returns failure when not authenticated as teacher", async () => {
    const http = makeHttp([]);
    const auth = makeAuth(authenticatedState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherGradebookCatalog();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("teacher");
    }
  });

  it("fetches and normalizes a populated gradebook notes grid", async () => {
    const notesBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        devoirs: [
          {
            id: 18877181,
            idProf: 221,
            nomProf: "Mme D. PROF",
            libelle: "Ecrit",
            coef: 3,
            date: "2025-12-10",
            dateAffichage: "2026-01-14",
            nonSignificatif: false,
            ccf: false,
            noteSur: 20,
            notationLettre: false,
            noteNegative: false,
            statutPeriode: "cloture",
            idPeriode: "A002X001",
            codeMatiere: "FRANC",
            codeSSMatiere: "",
            avecNote: true,
            commentaire: "",
            elementsProgramme: [],
            typeDevoir: { id: 8, code: "BB", libelle: "Bac blanc" },
          },
        ],
        eleves: [
          {
            eleve: {
              id: 6099,
              prenom: "Irem",
              nom: "AKYOL",
              classeLibelle: "Premiere C",
              codeClasse: "1C",
              sexe: "F",
              photo: "//photo.jpg",
              ordreArrivee: "A",
              dispositifs: [],
            },
            devoirs: {
              "18877181": {
                idNote: 46193197,
                idDevoir: 18877181,
                idPeriode: "A002X001",
                coef: 3,
                note: "8",
                noteSur: 20,
                lettre: "",
                notationLettre: false,
                date: "2025-12-10",
                devoirLibelle: "Ecrit",
                ccf: false,
                nonSignificatif: false,
                codeMatiere: "FRANC",
                codeSSMatiere: "",
                commentaire: "",
                elementsProgramme: [],
              },
            },
          },
        ],
      },
    };

    const http = makeHttp([notesBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherGradebookNotes({
      entityId: 85,
      periodCode: "A002",
      subjectCode: "FRANC",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.target).toEqual({ id: 85, entityType: "C", code: "3PA", label: "3ème Prépa Apprenti" });
      expect(result.data.subject).toEqual({ code: "FRANC", routeCode: "FRANC¤", label: "FRANCAIS" });
      expect(result.data.selectedPeriodCode).toBe("A002");
      expect(result.data.evaluationCount).toBe(1);
      expect(result.data.studentCount).toBe(1);
      expect(result.data.evaluations[0]?.homeworkType?.code).toBe("BB");
      expect(result.data.students[0]?.grades["18877181"]?.grade).toBe("8");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/enseignants/221/C/85/periodes/A002/matieres/FRANC%C2%A4/notes.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("fetches appreciation data and predefined appreciation templates", async () => {
    const appreciationsBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        eleves: [
          {
            eleve: {
              id: 6099,
              prenom: "Irem",
              nom: "AKYOL",
              codeClasse: "1C",
              sexe: "F",
              photo: "//photo.jpg",
              ordreArrivee: "A",
              dispositifs: [],
            },
            periodes: [
              {
                code: "A002",
                libelle: "Trimestre 2",
                libelleCourt: "T2",
                moyenne: "11,05",
                position: "",
                dateDebut: "20251124",
                dateFin: "20260205",
                ouverte: false,
                dateCalculMoyenne: "12/03/2026 à 08h01",
                appreciations: [{ code: "APP1", libelle: "", contenu: "QnJhdm8gLSBjb250aW51ZSE=" }],
                positionSSMat: [],
                elementsProgramme: [],
              },
            ],
          },
        ],
      },
    };
    const predefinedBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        appreciations: [
          {
            id: 2,
            code: "TB",
            libelle: "Qydlc3QgdHLDqHMgYmllbiw=",
            type: "Enseignant",
            idAuteur: 221,
          },
        ],
        parametrage: { nbCaractMax: 200 },
      },
    };

    const http = makeHttp([appreciationsBody, predefinedBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherGradebookAppreciations({
      entityId: 85,
      periodCode: "A002",
      subjectCode: "FRANC",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.target.label).toBe("3ème Prépa Apprenti");
      expect(result.data.subject.routeCode).toBe("FRANC¤");
      expect(result.data.selectedPeriodCode).toBe("A002");
      expect(result.data.studentCount).toBe(1);
      expect(result.data.students[0]?.periods[0]?.appreciations[0]?.content).toBe("Bravo - continue!");
      expect(result.data.predefinedAppreciations).toHaveLength(1);
      expect(result.data.predefinedAppreciations[0]?.label).toBe("C'est très bien,");
      expect(result.data.maxCharacters).toBe(200);
    }

    expect(http.postForm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/v3/enseignants/221/C/85/periodes/ALL/matieres/FRANC%C2%A4/appreciations.awp"),
      {},
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/v3/Enseignant/221/C/85/appreciationsPredefinies.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("lists teacher council targets from principal-professor classes", async () => {
    const catalogBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        etablissements: [
          {
            id: 6,
            code: "LP",
            libelle: "Lycée Pro",
            parametres: {
              grille: [{ heureDbt: "08:00", heureFin: "08:55" }],
            },
            niveaux: [
              {
                id: 1,
                code: "TERM",
                libelle: "Terminale",
                classes: [
                  {
                    id: 85,
                    idGroupe: 85,
                    code: "3PA",
                    libelle: "3ème Prépa Apprenti",
                    isPP: true,
                    periodes: [
                      {
                        codePeriode: "A001",
                        libelle: "Trimestre 1",
                        etat: "cloture",
                        saisieAppreciation: true,
                        saisieAppreciationClasse: true,
                        dateConseil: "2025-12-05",
                        matieres: [],
                      },
                      {
                        codePeriode: "A003",
                        libelle: "Trimestre 3",
                        etat: "ouvert",
                        saisieAppreciation: true,
                        saisieAppreciationClasse: true,
                        dateConseil: "2026-05-31",
                        matieres: [],
                      },
                    ],
                  },
                  {
                    id: 86,
                    idGroupe: 86,
                    code: "2PA",
                    libelle: "Deuxième Prépa",
                    isPP: false,
                    periodes: [
                      {
                        codePeriode: "A003",
                        libelle: "Trimestre 3",
                        etat: "ouvert",
                        saisieAppreciation: true,
                        saisieAppreciationClasse: true,
                        dateConseil: "2026-05-31",
                        matieres: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        groupes: [
          {
            id: 1505,
            etabId: 6,
            code: "VICLA_TG6",
            libelle: "Vie de classe TG6",
            periodes: [
              {
                codePeriode: "A003",
                libelle: "Trimestre 3",
                etat: "ouvert",
                saisieAppreciation: true,
                saisieAppreciationClasse: true,
                matieres: [],
              },
            ],
          },
        ],
        autresGroupes: [],
      },
    };

    const http = makeHttp([catalogBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.listTeacherCouncilTargets();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.targets).toEqual([
        {
          id: 85,
          entityType: "C",
          code: "3PA",
          label: "3ème Prépa Apprenti",
          isPP: true,
          periods: [
            {
              code: "A001",
              label: "Trimestre 1",
              state: "cloture",
              councilDate: "2025-12-05",
              appreciationOpen: true,
              classAppreciationOpen: true,
            },
            {
              code: "A003",
              label: "Trimestre 3",
              state: "ouvert",
              councilDate: "2026-05-31",
              appreciationOpen: true,
              classAppreciationOpen: true,
            },
          ],
        },
      ]);
    }
  });

  it("fetches teacher council detail with both template scopes", async () => {
    const catalogBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        etablissements: [
          {
            id: 6,
            code: "LP",
            libelle: "Lycée Pro",
            parametres: { grille: [] },
            niveaux: [
              {
                id: 1,
                code: "TERM",
                libelle: "Terminale",
                classes: [
                  {
                    id: 85,
                    idGroupe: 85,
                    code: "3PA",
                    libelle: "3ème Prépa Apprenti",
                    isPP: true,
                    periodes: [
                      {
                        codePeriode: "A003",
                        libelle: "Trimestre 3",
                        etat: "ouvert",
                        saisieAppreciation: true,
                        saisieAppreciationClasse: true,
                        dateConseil: "2026-05-31",
                        matieres: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        groupes: [],
        autresGroupes: [],
      },
    };

    const councilBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        eleves: [
          {
            id: 6099,
            prenom: "Irem",
            nom: "AKYOL",
            photo: "//photo.jpg",
            ordreArrivee: "A",
            sexe: "F",
            dispositifs: [],
            appreciationPP: {
              id: "6099,Prof Principal,A003,",
              code: "",
              libelle: "",
              date: "2026-03-05 09:19:15",
              text: "QnJhdm8gcG91ciBsZXMgZWZmb3J0cyE=",
            },
            appreciationCE: { id: "", code: "", libelle: "", date: "2026-03-15 14:09:02", text: "" },
            appreciationVS: { id: "", code: "", libelle: "", date: "2026-03-15 14:09:02", text: "" },
            appreciationCN: { id: "", code: "", libelle: "", date: "2026-03-15 14:09:02", text: "" },
            mentionDuConseil: { id: "2", code: "", libelle: "Encouragements", date: "2026-03-15 14:09:02", text: "" },
          },
        ],
        parametrage: {
          PPModifVS: true,
          PPModifTout: true,
          saisieAppreciationClasse: true,
          longueurMaxAppPP: 400,
          mentions: [
            { id: 2, libelle: "Encouragements", numLigne: 1 },
          ],
          appreciations: [
            { code: "APP1", id: 1, libelle: "Appréciation générale", nbCaracteres: 200 },
          ],
        },
        appreciationGenerale: {
          id: "APP1",
          code: "APP1",
          libelle: "Appréciation générale",
          date: "2026-03-15 14:09:02",
          text: "Q2xhc3NlIGludmVzdGllLg==",
        },
      },
    };

    const ppTemplatesBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        appreciations: [],
        parametrage: { nbCaractMax: 200 },
      },
    };

    const teacherTemplatesBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        appreciations: [
          {
            id: 2,
            code: "TB",
            libelle: "Qydlc3QgdHLDqHMgYmllbiw=",
            type: "Enseignant",
            idAuteur: 221,
          },
        ],
        parametrage: { nbCaractMax: 200 },
      },
    };

    const http = makeHttp([catalogBody, councilBody, ppTemplatesBody, teacherTemplatesBody]);
    const auth = makeAuth(teacherAuthState);
    const service = new EdDataService(http, auth as any);

    const result = await service.getTeacherCouncilDetail({
      entityId: 85,
      periodCode: "A003",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.target).toEqual({
        id: 85,
        entityType: "C",
        code: "3PA",
        label: "3ème Prépa Apprenti",
        isPP: true,
      });
      expect(result.data.selectedPeriod).toMatchObject({
        code: "A003",
        label: "Trimestre 3",
        state: "ouvert",
      });
      expect(result.data.studentCount).toBe(1);
      expect(result.data.students[0]?.appreciationPP?.text).toBe("Bravo pour les efforts!");
      expect(result.data.settings.mentionOptions[0]).toEqual({ id: 2, label: "Encouragements", lineNumber: 1 });
      expect(result.data.generalAppreciation?.text).toBe("Classe investie.");
      expect(result.data.principalProfessorPredefinedAppreciations).toEqual([]);
      expect(result.data.principalProfessorMaxCharacters).toBe(200);
      expect(result.data.teacherPredefinedAppreciations[0]?.label).toBe("C'est très bien,");
      expect(result.data.teacherMaxCharacters).toBe(200);
    }

    expect(http.postForm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/v3/niveauxListe.awp"),
      {},
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/v3/enseignants/221/C/85/periodes/A003/conseilDeClasse.awp"),
      {},
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("/v3/Prof%20Principal/221/C/85/appreciationsPredefinies.awp"),
      {},
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("/v3/Enseignant/221/C/85/appreciationsPredefinies.awp"),
      {},
      { includeGtk: false },
    );
  });
});