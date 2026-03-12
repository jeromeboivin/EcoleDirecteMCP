import { describe, expect, it, vi } from "vitest";
import { EdDataService } from "../../src/ecoledirecte/data/service.js";
import type { AuthState } from "../../src/ecoledirecte/auth/types.js";
import type { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";

function makeResponse(body: RawApiResponse): Response {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function makeHttp(responses: RawApiResponse[]): EdHttpClient {
  let index = 0;
  return {
    version: "4.96.3",
    postForm: vi.fn().mockImplementation(() => Promise.resolve(makeResponse(responses[index++] ?? responses[responses.length - 1]))),
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
});