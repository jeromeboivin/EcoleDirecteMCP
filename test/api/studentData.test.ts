import { describe, expect, it } from "vitest";
import {
  normalizeCahierDeTextesDayResponse,
  normalizeCahierDeTextesResponse,
} from "../../src/ecoledirecte/api/cahierDeTextes.js";
import { normalizeCarnetCorrespondanceResponse } from "../../src/ecoledirecte/api/carnetCorrespondance.js";
import { normalizeEmploiDuTempsResponse } from "../../src/ecoledirecte/api/emploiDuTemps.js";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeSessionsRdvResponse } from "../../src/ecoledirecte/api/sessionsRdv.js";
import { normalizeStudentProfileResponse } from "../../src/ecoledirecte/api/studentProfile.js";
import { normalizeVieDeLaClasseResponse } from "../../src/ecoledirecte/api/vieDeLaClasse.js";
import { normalizeVieScolaireResponse } from "../../src/ecoledirecte/api/vieScolaire.js";

describe("student data normalizers", () => {
  it("normalizes cahier de textes days and assignments", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        "2026-03-13": [{ matiere: "Français", aFaire: "0", documentsAFaire: "0", effectue: "1", interrogation: "0", rendreEnLigne: "0", tags: [] }],
        "2026-03-12": [{ idDevoir: 12, matiere: "Mathématiques", codeMatiere: "MATH", aFaire: "1", documentsAFaire: "1", effectue: "0", interrogation: "1", rendreEnLigne: "0", donneLe: "2026-03-10", tags: [{ libelle: "Quiz" }] }],
      },
    };

    const result = normalizeCahierDeTextesResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data?.days.map((day) => day.date)).toEqual(["2026-03-12", "2026-03-13"]);
    expect(result.data?.totalAssignments).toBe(2);
    expect(result.data?.days[0]?.assignments[0]).toMatchObject({
      homeworkId: 12,
      subject: "Mathématiques",
      subjectCode: "MATH",
      toDo: true,
      documentsToDo: true,
      completed: false,
      interrogation: true,
      tags: ["Quiz"],
    });
  });

  it("normalizes a cahier de textes day detail payload", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        date: "2026-03-12",
        matieres: [
          {
            entityCode: "3B-ESP",
            entityLibelle: "3B espagnol",
            entityType: "G",
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
              tags: [{ libelle: "Quiz" }],
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
          {
            matiere: "HISTOIRE-GEOGRAPHIE",
            codeMatiere: "HI-GE",
            nomProf: "M. PARFANT C.",
            id: 4905,
            interrogation: false,
            blogActif: false,
            nbJourMaxRenduDevoir: 0,
            contenuDeSeance: {
              idDevoir: 4905,
              contenu: "PHA+Q29udGVudSBkZSBzw6lhbmNlPC9wPg==",
              documents: [],
              elementsProg: [],
              liensManuel: [],
            },
          },
        ],
      },
    };

    const result = normalizeCahierDeTextesDayResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      date: "2026-03-12",
      homeworkCount: 1,
      lessonContentCount: 2,
    });
    expect(result.data?.subjects[0]).toMatchObject({
      entityCode: "3B-ESP",
      entityLabel: "3B espagnol",
      entityType: "G",
      subject: "ESPAGNOL LV2",
      subjectCode: "ESP2",
      teacher: "Mme LADAVIERE V.",
      homeworkId: 4579,
      homework: {
        homeworkId: 4579,
        html: "<p>Devoir</p>",
        assignedOn: "2026-03-02",
        completed: true,
        onlineSubmission: false,
        tags: ["Quiz"],
      },
      lessonContent: {
        lessonId: 4579,
        html: "<p>Cours</p>",
      },
    });
    expect(result.data?.subjects[1]).toMatchObject({
      subject: "HISTOIRE-GEOGRAPHIE",
      homeworkId: 4905,
      lessonContent: {
        lessonId: 4905,
        html: "<p>Contenu de séance</p>",
      },
    });
  });

  it("normalizes a student profile payload", () => {
    const raw: RawApiResponse = {
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

    const result = normalizeStudentProfileResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      id: 1154,
      firstName: "Antonin",
      lastName: "BOIVIN",
      fullName: "Antonin BOIVIN",
      gender: "M",
      boarderStatus: "Demi-pensionnaire",
      birthDate: "2011-11-06",
      email: "anne.roudier@free.fr",
      mobile: "0671561833",
      primarySchool: false,
      principalProfessor: false,
      photoUrl: "https://doc1.ecoledirecte.com/PhotoEleves/demo.jpg",
      classId: 18,
      classLabel: "3B",
      classIsGraded: true,
      establishmentId: 1,
    });
  });

  it("normalizes vie scolaire arrays and settings", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        absencesRetards: [{ id: 1, idEleve: 1154, typeElement: "absence", date: "2026-03-02", justifie: "1", motif: "Medical" }],
        dispenses: [{ id: 2, idEleve: 1154, matiere: "Sport", presence: "0" }],
        sanctionsEncouragements: [{ id: 3, idEleve: 1154, libelle: "Encouragements", par: "Conseil" }],
        permisPoint: { points: 12 },
        parametrage: { justificationEnLigne: "1", afficherPermisPoint: "0" },
      },
    };

    const result = normalizeVieScolaireResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data?.absencesRetards[0]).toMatchObject({ id: 1, studentId: 1154, justifie: true });
    expect(result.data?.dispenses[0]).toMatchObject({ id: 2, matiere: "Sport", presence: false });
    expect(result.data?.sanctionsEncouragements[0]).toMatchObject({ id: 3, label: "Encouragements", par: "Conseil" });
    expect(result.data?.settings).toMatchObject({ justificationEnLigne: true, afficherPermisPoint: false });
    expect(result.data?.permisPoint).toEqual({ points: 12 });
  });

  it("normalizes carnet de correspondance entries", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        correspondances: [{ idEleve: 1154, prenom: "Antonin", nom: "Boivin", dateCreation: "2026-03-01", contenu: "Signature demandée", type: "Observation", isSignatureDemandee: "1", urlFichier: "https://example.invalid/file.pdf", idSessionRDV: 7, auteur: { id: 9, role: "professeur", prenom: "Marie", nom: "Durand" } }],
        suivis: [{ id: 99, status: "open" }],
      },
    };

    const result = normalizeCarnetCorrespondanceResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data?.correspondences[0]).toMatchObject({
      studentId: 1154,
      studentName: "Antonin Boivin",
      content: "Signature demandée",
      signatureRequired: true,
      fileUrl: "https://example.invalid/file.pdf",
      appointmentSessionId: 7,
      author: { id: 9, role: "professeur", name: "Marie Durand" },
    });
    expect(result.data?.followUps).toEqual([{ id: 99, status: "open" }]);
  });

  it("normalizes sessions RDV record arrays", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        sessions: [{ id: 1 }],
        auteurs: [{ id: 2 }],
        invites: [{ id: 3 }],
        indisposInvites: [{ id: 4 }],
      },
    };

    const result = normalizeSessionsRdvResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      sessions: [{ id: 1 }],
      authors: [{ id: 2 }],
      invitees: [{ id: 3 }],
      unavailableInvitees: [{ id: 4 }],
    });
  });

  it("normalizes vie de la classe sections", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: { conseil: { date: "2026-03-20" }, delegues: [{ id: 1 }] },
    };

    const result = normalizeVieDeLaClasseResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      sections: { conseil: { date: "2026-03-20" }, delegues: [{ id: 1 }] },
      sectionKeys: ["conseil", "delegues"],
      empty: false,
    });
  });

  it("normalizes emploi du temps events grouped by day", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: [
        { id: 2, text: "Français", matiere: "Français", start_date: "2026-03-13 10:00", end_date: "2026-03-13 11:00", dispensable: "0", dispense: "0", isFlexible: "0", isModifie: "0", contenuDeSeance: "0", devoirAFaire: "0", isAnnule: "0" },
        { id: 1, text: "Mathématiques", matiere: "Mathématiques", codeMatiere: "MATH", start_date: "2026-03-12 08:00", end_date: "2026-03-12 09:00", dispensable: "1", dispense: "0", isFlexible: "0", isModifie: "1", contenuDeSeance: "1", devoirAFaire: "1", isAnnule: "0" },
      ],
    };

    const result = normalizeEmploiDuTempsResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data?.days.map((day) => day.date)).toEqual(["2026-03-12", "2026-03-13"]);
    expect(result.data?.totalEvents).toBe(2);
    expect(result.data?.days[0]?.events[0]).toMatchObject({
      id: 1,
      subject: "Mathématiques",
      subjectCode: "MATH",
      dispensable: true,
      modified: true,
      hasLessonContent: true,
      hasHomework: true,
      cancelled: false,
    });
  });
});