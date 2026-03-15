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

function makeHttp(responses: RawApiResponse[]): EdHttpClient {
  let index = 0;
  return {
    version: "4.96.3",
    postForm: vi.fn().mockImplementation(() => Promise.resolve(makeResponse(responses[index++] ?? responses[responses.length - 1]))),
    get: vi.fn(),
    captureAuthHeaders: vi.fn(),
  } as unknown as EdHttpClient;
}

function makeAuth(state: AuthState, validatedState: AuthState = state) {
  return {
    getState: vi.fn().mockReturnValue(state),
    validateSession: vi.fn().mockResolvedValue(validatedState),
    switchAccount: vi.fn().mockResolvedValue(validatedState),
  };
}

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
      classes: [{ id: 67, code: "TA", label: "Terminale A" }],
      groups: [{ id: 1505, code: "VICLA_TG6", label: "Vie de classe TG6", classId: 67, subjectCode: "VICLA" }],
      subjects: [{ code: "FRANC", label: "FRANCAIS" }],
    },
  ],
};

describe("additional teacher data service methods", () => {
  it("returns full teacher message content for a selected message", async () => {
    const messageBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        id: 50507,
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
        subject: "Direct'édito N°12",
        content: "PGRpdj5Cb25qb3VyPC9kaXY+",
        date: "2026-03-13 13:40:14",
        to: [],
        files: [{ id: 9528, libelle: "Direct_edito.pdf", unc: "file-9528" }],
        from: {
          nom: "LAGRINI",
          prenom: "Sarah",
          particule: "",
          civilite: "Mme",
          role: "A",
          id: 254,
          read: true,
          fonctionPersonnel: "",
        },
      },
    };

    const http = makeHttp([messageBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherMessageDetail({ messageId: 50507, messagesYear: "2025-2026" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teacher.id).toBe(221);
      expect(result.data.messagesYear).toBe("2025-2026");
      expect(result.data.subject).toBe("Direct'édito N°12");
      expect(result.data.contentHtml).toBe("<div>Bonjour</div>");
      expect(result.data.from?.name).toBe("Mme Sarah LAGRINI");
      expect(result.data.attachmentCount).toBe(1);
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/enseignants/221/messages/50507.awp?verbe=get&mode=destinataire"),
      { anneeMessages: "2025-2026" },
      { includeGtk: false },
    );
  });

  it("returns teacher class students when the roster payload is wrapped in eleves", async () => {
    const rosterBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        eleves: [
          {
            id: 6099,
            prenom: "Irem",
            nom: "AKYOL",
            sexe: "F",
            classeId: 85,
            classeLibelle: "Premiere C",
            photo: "//photo.jpg",
          },
        ],
        entity: {
          id: 85,
          code: "1C",
          libelle: "Premiere C",
          type: "C",
          isFlexible: false,
          isPrimaire: false,
        },
      },
    };

    const http = makeHttp([rosterBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherClassStudents({ classId: 85 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.class).toEqual({ id: 85, name: "Premiere C", code: "1C" });
      expect(result.data.entity).toEqual({
        id: 85,
        code: "1C",
        label: "Premiere C",
        type: "C",
        isFlexible: false,
        isPrimary: false,
      });
      expect(result.data.students).toHaveLength(1);
      expect(result.data.students[0]).toMatchObject({
        id: 6099,
        name: "Irem AKYOL",
        classId: 85,
        className: "Premiere C",
      });
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/classes/85/eleves.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("returns the teacher class carnet de correspondance overview", async () => {
    const rosterBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: [
        {
          id: 3721,
          prenom: "Duran",
          nom: "ERDOGAN",
          sexe: "M",
          classe: { id: 67, libelle: "Terminale A", code: "TA" },
        },
      ],
    };
    const carnetBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        typesCorrespondance: [{ id: 1, libelle: "Information" }],
        typesSanction: [{ id: 2, libelle: "Punition" }],
        motifsSanction: [{ id: 3, libelle: "Retard" }],
        motifsIncident: [{ id: 4, libelle: "Comportement" }],
        categoriesSuivi: [{ id: 5, libelle: "Accompagnement" }],
        correspondances: [
          {
            idEleve: 3721,
            prenom: "Duran",
            nom: "ERDOGAN",
            dateCreation: "2026-03-11",
            contenu: "Information aux familles",
            type: "Information",
            isSignatureDemandee: "1",
            auteur: { id: 9, role: "P", prenom: "CSJA", nom: "SURVEILLANT" },
          },
        ],
        demandesSanctionOrIncident: [{ id: 6, nature: "INCIDENT" }],
        suivis: [{ id: 7, status: "open" }],
        parametrage: { saisiePossible: true },
      },
    };

    const http = makeHttp([rosterBody, carnetBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherClassCarnetCorrespondance({ classId: 67 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.class).toEqual({ id: 67, name: "Terminale A", code: "TA" });
      expect(result.data.studentCount).toBe(1);
      expect(result.data.correspondenceCount).toBe(1);
      expect(result.data.disciplinaryRequestCount).toBe(1);
      expect(result.data.followUpCount).toBe(1);
      expect(result.data.students[0]?.name).toBe("Duran ERDOGAN");
    }
    expect(http.postForm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/v3/classes/67/eleves.awp"),
      {},
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/v3/classes/67/carnetCorrespondance.awp?verbe=get&showAll=0"),
      {},
      { includeGtk: false },
    );
  });

  it("returns the teacher student carnet detail bundle", async () => {
    const profileBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        id: 3721,
        nom: "ERDOGAN",
        particule: "",
        prenom: "Duran",
        sexe: "M",
        regime: "Externe",
        dateDeNaissance: "2008-01-01",
        email: "duran@example.com",
        mobile: "0600000000",
        isPrimaire: false,
        isPP: false,
        photo: "//photo.jpg",
        classeId: 67,
        classeLibelle: "Terminale A",
        classeEstNote: 1,
        idEtablissement: 1,
      },
    };
    const carnetBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        correspondances: [
          {
            idEleve: 3721,
            prenom: "Duran",
            nom: "ERDOGAN",
            contenu: "Information aux familles",
            isSignatureDemandee: "1",
          },
        ],
        suivis: [{ id: 7, status: "open" }],
      },
    };
    const schoolLifeBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        absencesRetards: [{ id: 1 }],
        dispenses: [],
        sanctionsEncouragements: [{ id: 2 }],
        parametrage: {},
      },
    };
    const sessionsBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        sessions: [{ id: 1, title: "Parents-professeurs" }],
        auteurs: [],
        invites: [],
        indisposInvites: [],
      },
    };

    const http = makeHttp([profileBody, carnetBody, schoolLifeBody, sessionsBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherStudentCarnetCorrespondance({ studentId: 3721 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.student).toEqual({ id: 3721, name: "Duran ERDOGAN", classId: 67, className: "Terminale A" });
      expect(result.data.profile.fullName).toBe("Duran ERDOGAN");
      expect(result.data.carnet.correspondences).toHaveLength(1);
      expect(result.data.schoolLife.absencesRetards).toHaveLength(1);
      expect(result.data.sessionsRdv.sessions).toHaveLength(1);
    }
    expect(http.postForm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("https://apip.ecoledirecte.com/v3/eleves/3721.awp"),
      { anneeScolaire: "" },
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("https://apip.ecoledirecte.com/v3/eleves/3721/eleveCarnetCorrespondance.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("filters teacher cahier de textes slots by entity and subject", async () => {
    const cahierBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: [
        {
          idCours: 101,
          date: "2026-02-23",
          start_date: "2026-02-23 08:00",
          end_date: "2026-02-23 09:00",
          entityId: 67,
          entityCode: "TA",
          entityLibelle: "Terminale A",
          entityType: "C",
          matiereCode: "FRANC",
          matiereLibelle: "FRANCAIS",
          travailAFaire: true,
          contenuDeSeance: true,
          aFaire: { contenu: "PHA+RGV2b2lyPC9wPg==" },
          seance: { contenu: "PHA+Q291cnM8L3A+" },
        },
        {
          idCours: 102,
          date: "2026-02-24",
          start_date: "2026-02-24 08:00",
          end_date: "2026-02-24 09:00",
          entityId: 1505,
          entityCode: "VICLA_TG6",
          entityLibelle: "Vie de classe TG6",
          entityType: "G",
          matiereCode: "VICLA",
          matiereLibelle: "VIE DE CLASSE",
          travailAFaire: false,
          contenuDeSeance: true,
          seance: { contenu: "PHA+U2VhbmNlPC9wPg==" },
        },
      ],
    };

    const http = makeHttp([cahierBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherCahierDeTextes({
      dateDebut: "2026-01-26",
      dateFin: "2026-05-03",
      entityId: 67,
      entityType: "C",
      subjectCode: "FRANC",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slotCount).toBe(1);
      expect(result.data.homeworkCount).toBe(1);
      expect(result.data.lessonContentCount).toBe(1);
      expect(result.data.selectedEntityId).toBe(67);
      expect(result.data.selectedEntityType).toBe("C");
      expect(result.data.selectedSubjectCode).toBe("FRANC");
      expect(result.data.slots[0]?.subjectLabel).toBe("FRANCAIS");
    }
    expect(http.postForm).toHaveBeenCalledWith(
      expect.stringContaining("/v3/cahierdetexte/loadslots/2026-01-26/2026-05-03.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("lists teacher LSL classes and returns a scoped student detail", async () => {
    const lslBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        appreciations: [{ code: "FicheAvenir", libelle: "fiche Avenir", nbMaxCaracteres: 600 }],
        avisExamens: [{ code: "T", libelle: "Très favorable" }],
        engagementsScolaire: [{ code: "NE", libelle: "Eco-délégué" }],
        engagementsScolaireAvecPrecision: [{ code: "NC", libelle: "Délégué de classe" }],
        notations: [{ code: "-1", libelle: "Aucune évaluation" }],
        saisieAvisCESeulementParPersonnel: true,
        saisieAvisEngagementsSeulementPP: false,
        classes: [
          {
            idClasse: 67,
            libelle: "Terminale A",
            isPP: true,
            isClasseTerminale: true,
            isFiliereGeneraleOuTechno: true,
            isFiliereTechno: false,
            isFilierePro: false,
            matieres: [{ code: "010300", codeInterne: "PHILO", libelle: "PHILOSOPHIE", modaliteElection: "TRONC_COMMUN", competences: [{ code: "0431" }] }],
            eleves: [
              {
                id: 4018,
                prenom: "Gulseren",
                nom: "BASAGAC",
                particule: "",
                ordreArrivee: "A",
                sexe: "F",
                idClasse: 67,
                avisEleve: [{ type: "AVIS_CHEFETAB", code: "T", texte: "", nomAuteur: "DEBHANE", prenomAuteur: "Céline", date: "2026-03-12", nbSemaines: 0, isPartieEffectueeEtranger: false }],
                engagementsEleve: [{ type: "ENGAGEMENT", code: "NE", isActif: false, libelle: "" }],
                engagementsEleveAvecPrecision: [{ type: "ENGAGEMENT_AVEC_PRECISION", code: "NC", isActif: true, libelle: "" }],
                mobiliteScolaire: { codePays: "ES", libellePays: "Espagne", titreRapport: "Voyage" },
                matieres: [{ code: "010300", codeInterne: "PHILO", libelle: "PHILOSOPHIE", appAnnuelle: "QnJhdm8=", appreciations: [{ code: "FicheAvenir", texte: "QXZpcyBwb3NpdGlm" }], competences: [{ code: "0431", libelle: "Argumenter", evaluation: "-1", ordre: 1 }] }],
              },
            ],
          },
        ],
      },
    };

    const listHttp = makeHttp([lslBody]);
    const listService = new EdDataService(listHttp, makeAuth(teacherAuthState) as any);

    const listResult = await listService.listTeacherLslClasses();

    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.data.classes).toHaveLength(1);
      expect(listResult.data.classes[0]).toMatchObject({
        id: 67,
        label: "Terminale A",
        studentCount: 1,
        subjectCount: 1,
      });
      expect(listResult.data.classes[0]?.students[0]).toMatchObject({ id: 4018, name: "Gulseren BASAGAC", subjectCount: 1 });
      expect(listResult.data.notations[0]).toEqual({ code: "-1", label: "Aucune évaluation" });
    }

    const detailHttp = makeHttp([lslBody]);
    const detailService = new EdDataService(detailHttp, makeAuth(teacherAuthState) as any);

    const detailResult = await detailService.getTeacherLslStudentDetail({ classId: 67, studentId: 4018 });

    expect(detailResult.ok).toBe(true);
    if (detailResult.ok) {
      expect(detailResult.data.class.label).toBe("Terminale A");
      expect(detailResult.data.student.name).toBe("Gulseren BASAGAC");
      expect(detailResult.data.student.subjects[0]?.annualAppreciation).toBe("Bravo");
      expect(detailResult.data.student.subjects[0]?.competencies[0]?.evaluationLabel).toBe("Aucune évaluation");
      expect(detailResult.data.examOpinions[0]).toEqual({ code: "T", label: "Très favorable" });
    }
  });

  it("returns teacher student notes with disciplines and appreciations", async () => {
    const appreciationText = "Élève sérieuse et investie.";
    const encodedAppreciation = Buffer.from(appreciationText).toString("base64");
    const ppText = "Trimestre satisfaisant.";
    const encodedPP = Buffer.from(ppText).toString("base64");

    const profileBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        id: 4318,
        nom: "BOUYSSET",
        particule: "",
        prenom: "Thaïs",
        sexe: "F",
        regime: "Externe",
        dateDeNaissance: "2008-06-15",
        email: "",
        mobile: "",
        isPrimaire: false,
        isPP: false,
        photo: "//photo.jpg",
        classeId: 85,
        classeLibelle: "Premiere C",
        classeEstNote: 1,
        idEtablissement: 1,
      },
    };
    const notesBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        parametrage: {
          moyenneEleve: true,
          moyenneClasse: true,
          moyenneGenerale: true,
        },
        periodes: [
          {
            idPeriode: "P2",
            codePeriode: "A002",
            periode: "Trimestre 2",
            annuel: false,
            cloture: false,
            examenBlanc: false,
            ensembleMatieres: {
              moyenneGenerale: "13.5",
              moyenneClasse: "12.0",
              rang: 5,
              effectif: 30,
              appreciationPP: encodedPP,
              disciplines: [
                {
                  id: 201,
                  codeMatiere: "FRANC",
                  discipline: "Français",
                  moyenne: "14.0",
                  moyenneClasse: "12.5",
                  coef: "3",
                  rang: 3,
                  effectif: 30,
                  groupeMatiere: false,
                  option: false,
                  sousMatiere: false,
                  professeurs: [{ id: 221, nom: "Mme ROUDIER BOIVIN" }],
                  appreciations: [encodedAppreciation],
                },
              ],
            },
          },
        ],
        notes: [
          {
            id: 500,
            devoir: "Commentaire de texte",
            codePeriode: "A002",
            codeMatiere: "FRANC",
            libelleMatiere: "Français",
            enLettre: false,
            coef: "1",
            noteSur: "20",
            valeur: "15",
            nonSignificatif: false,
            date: "2026-01-20",
          },
        ],
      },
    };

    const http = makeHttp([profileBody, notesBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherStudentNotes({ studentId: 4318 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.student).toEqual({
        id: 4318,
        name: "Thaïs BOUYSSET",
        classId: 85,
        className: "Premiere C",
      });
      expect(result.data.periods).toHaveLength(1);
      expect(result.data.periods[0].disciplines).toHaveLength(1);
      expect(result.data.periods[0].disciplines[0].teachers[0].name).toBe("Mme ROUDIER BOIVIN");
      expect(result.data.periods[0].disciplines[0].appreciations[0]).toBe(appreciationText);
      expect(result.data.periods[0].appreciationPP).toBe(ppText);
      expect(result.data.grades).toHaveLength(1);
      expect(result.data.grades[0].value).toBe("15");
    }

    expect(http.postForm).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("https://apip.ecoledirecte.com/v3/eleves/4318.awp"),
      {},
      { includeGtk: false },
    );
    expect(http.postForm).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("https://apip.ecoledirecte.com/v3/eleves/4318/notes.awp"),
      {},
      { includeGtk: false },
    );
  });

  it("filters teacher student notes by periodCode", async () => {
    const profileBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        id: 4318,
        nom: "BOUYSSET",
        particule: "",
        prenom: "Thaïs",
        sexe: "F",
        classeId: 85,
        classeLibelle: "Premiere C",
      },
    };
    const notesBody: RawApiResponse = {
      code: ApiCode.OK,
      token: "teacher-tok",
      message: "",
      data: {
        parametrage: {},
        periodes: [
          {
            idPeriode: "P1",
            codePeriode: "A001",
            periode: "Trimestre 1",
            annuel: false,
            cloture: true,
            examenBlanc: false,
            ensembleMatieres: { disciplines: [] },
          },
          {
            idPeriode: "P2",
            codePeriode: "A002",
            periode: "Trimestre 2",
            annuel: false,
            cloture: false,
            examenBlanc: false,
            ensembleMatieres: { disciplines: [] },
          },
        ],
        notes: [
          { id: 1, devoir: "DS1", codePeriode: "A001", libelleMatiere: "Français", enLettre: false, nonSignificatif: false },
          { id: 2, devoir: "DS2", codePeriode: "A002", libelleMatiere: "Français", enLettre: false, nonSignificatif: false },
        ],
      },
    };

    const http = makeHttp([profileBody, notesBody]);
    const service = new EdDataService(http, makeAuth(teacherAuthState) as any);

    const result = await service.getTeacherStudentNotes({ studentId: 4318, periodCode: "A002" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.periods).toHaveLength(1);
      expect(result.data.periods[0].code).toBe("A002");
      expect(result.data.grades).toHaveLength(1);
      expect(result.data.grades[0].id).toBe(2);
      expect(result.data.selectedPeriodCode).toBe("A002");
    }
  });
});