import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeTeacherCarnetCorrespondanceClassResponse } from "../../src/ecoledirecte/api/teacherCarnetCorrespondance.js";
import { normalizeTeacherCahierDeTextesResponse } from "../../src/ecoledirecte/api/teacherCahierDeTextes.js";
import { normalizeTeacherLslResponse } from "../../src/ecoledirecte/api/teacherLsl.js";

describe("additional teacher data normalizers", () => {
  describe("normalizeTeacherCarnetCorrespondanceClassResponse", () => {
    it("normalizes the teacher class carnet de correspondance payload", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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

      const result = normalizeTeacherCarnetCorrespondanceClassResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        correspondenceTypes: [{ id: 1, label: "Information" }],
        sanctionTypes: [{ id: 2, label: "Punition" }],
        sanctionReasons: [{ id: 3, label: "Retard" }],
        incidentReasons: [{ id: 4, label: "Comportement" }],
        followUpCategories: [{ id: 5, label: "Accompagnement" }],
        correspondenceCount: 1,
        disciplinaryRequestCount: 1,
        followUpCount: 1,
      });
      expect(result.data?.correspondences[0]).toMatchObject({
        studentId: 3721,
        studentName: "Duran ERDOGAN",
        signatureRequired: true,
        author: { id: 9, role: "P", name: "CSJA SURVEILLANT" },
      });
      expect(result.data?.settings).toEqual({ saisiePossible: true });
    });
  });

  describe("normalizeTeacherCahierDeTextesResponse", () => {
    it("normalizes teacher cahier de textes slots with inline homework and lesson content", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [
          {
            idCours: 101,
            idCDT: 3001,
            date: "2026-02-23",
            start_date: "2026-02-23 08:00",
            end_date: "2026-02-23 09:00",
            entityId: 67,
            entityCode: "TA",
            entityLibelle: "Terminale A",
            entityType: "C",
            salle: "B12",
            matiereCode: "FRANC",
            matiereLibelle: "FRANCAIS",
            travailAFaire: true,
            contenuDeSeance: true,
            interrogation: false,
            aFaire: {
              idDevoir: 3001,
              contenu: "PHA+RGV2b2lyPC9wPg==",
              rendreEnLigne: true,
              donneLe: "2026-02-20",
              effectue: false,
              ressourceDocuments: [{ libelle: "audio.mp3", url: "//doc1.ecoledirecte.com/audio.mp3" }],
              documents: [{ fichierId: 11, leTypeDeFichier: "FICHIER_CDT", libelle: "Consigne.pdf" }],
              documentsRendus: [],
              elementsProg: [{ id: 1 }],
              liensManuel: [],
              tags: ["Quiz"],
            },
            seance: {
              idDevoir: 3001,
              contenu: "PHA+Q291cnM8L3A+",
              documents: [{ libelle: "Cours.pdf", href: "https://doc1.ecoledirecte.com/cours.pdf" }],
              elementsProg: [],
              liensManuel: [],
            },
          },
          {
            idCours: 102,
            date: "2026-02-24",
            start_date: "2026-02-24 10:00",
            end_date: "2026-02-24 11:00",
            entityId: 1505,
            entityCode: "VICLA_TG6",
            entityLibelle: "Vie de classe TG6",
            entityType: "G",
            matiereCode: "VICLA",
            matiereLibelle: "VIE DE CLASSE",
            travailAFaire: false,
            contenuDeSeance: true,
            interrogation: true,
            seance: {
              contenu: "PHA+U2VhbmNlPC9wPg==",
              documents: [],
              elementsProg: [],
              liensManuel: [],
            },
          },
        ],
      };

      const result = normalizeTeacherCahierDeTextesResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.slotCount).toBe(2);
      expect(result.data?.homeworkCount).toBe(1);
      expect(result.data?.lessonContentCount).toBe(2);
      expect(result.data?.slots[0]).toMatchObject({
        courseId: 101,
        entityId: 67,
        entityType: "C",
        subjectCode: "FRANC",
        hasHomework: true,
        hasLessonContent: true,
      });
      expect(result.data?.slots[0]?.homework).toMatchObject({
        homeworkId: 3001,
        html: "<p>Devoir</p>",
        onlineSubmission: true,
        documents: [{ id: 11, downloadId: "11", name: "Consigne.pdf", type: "FICHIER_CDT" }],
        tags: ["Quiz"],
      });
      expect(result.data?.slots[0]?.lessonContent?.html).toBe("<p>Cours</p>");
      expect(result.data?.slots[1]?.lessonContent?.html).toBe("<p>Seance</p>");
    });
  });

  describe("normalizeTeacherLslResponse", () => {
    it("normalizes teacher LSL classes, catalogs, and a scoped student detail", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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
              matieres: [
                {
                  code: "010300",
                  codeInterne: "PHILO",
                  libelle: "PHILOSOPHIE",
                  modaliteElection: "TRONC_COMMUN",
                  competences: [{ code: "0431" }],
                },
              ],
              eleves: [
                {
                  id: 4018,
                  prenom: "Gulseren",
                  nom: "BASAGAC",
                  particule: "",
                  ordreArrivee: "A",
                  sexe: "F",
                  idClasse: 67,
                  photo: "//photo.jpg",
                  avisEleve: [
                    {
                      type: "AVIS_CHEFETAB",
                      code: "T",
                      texte: "",
                      nomAuteur: "DEBHANE",
                      prenomAuteur: "Céline",
                      date: "2026-03-12",
                      nbSemaines: 0,
                      isPartieEffectueeEtranger: false,
                    },
                  ],
                  engagementsEleve: [{ type: "ENGAGEMENT", code: "NE", isActif: false, libelle: "" }],
                  engagementsEleveAvecPrecision: [{ type: "ENGAGEMENT_AVEC_PRECISION", code: "NC", isActif: true, libelle: "" }],
                  mobiliteScolaire: {
                    codePays: "ES",
                    libellePays: "Espagne",
                    notePresentation: "",
                    noteTheme: "",
                    noteReflexion: "",
                    titreRapport: "Voyage",
                  },
                  matieres: [
                    {
                      code: "010300",
                      codeInterne: "PHILO",
                      libelle: "PHILOSOPHIE",
                      modaliteElection: "TRONC_COMMUN",
                      appAnnuelle: "QnJhdm8=",
                      appreciations: [{ code: "FicheAvenir", texte: "QXZpcyBwb3NpdGlm", prenomAuteur: "Céline", nomAuteur: "DEBHANE" }],
                      competences: [{ code: "0431", libelle: "Argumenter", evaluation: "-1", ordre: 1 }],
                      moyenneClasse: "11,2",
                      moyennePeriode1: "10,5",
                      moyennePeriode2: "11,0",
                      moyennePeriode3: "12,1",
                      inf8: 2,
                      entre8et12: 10,
                      sup12: 12,
                      notationDNL: "A",
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = normalizeTeacherLslResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        appreciations: [{ code: "FicheAvenir", label: "fiche Avenir", maxCharacters: 600 }],
        examOpinions: [{ code: "T", label: "Très favorable" }],
        schoolEngagements: [{ code: "NE", label: "Eco-délégué" }],
        detailedSchoolEngagements: [{ code: "NC", label: "Délégué de classe" }],
        notations: [{ code: "-1", label: "Aucune évaluation" }],
        headTeacherOnlyExamOpinion: true,
        principalProfessorOnlyEngagements: false,
      });
      expect(result.data?.classes[0]).toMatchObject({
        id: 67,
        label: "Terminale A",
        principalProfessor: true,
        isTerminalClass: true,
        isGeneralOrTechno: true,
        studentCount: 1,
        subjectCount: 1,
      });
      expect(result.data?.classes[0]?.students[0]).toMatchObject({
        id: 4018,
        name: "Gulseren BASAGAC",
        arrivalOrder: "A",
        gender: "F",
        mobility: { countryCode: "ES", countryLabel: "Espagne", reportTitle: "Voyage" },
      });
      expect(result.data?.classes[0]?.students[0]?.examOpinions[0]).toMatchObject({
        code: "T",
        label: "Très favorable",
        authorName: "Céline DEBHANE",
      });
      expect(result.data?.classes[0]?.students[0]?.subjects[0]).toMatchObject({
        code: "010300",
        annualAppreciation: "Bravo",
        classAverage: "11,2",
        lessThan8: 2,
        between8And12: 10,
        above12: 12,
        dnlNotation: "A",
      });
      expect(result.data?.classes[0]?.students[0]?.subjects[0]?.appreciations[0]).toMatchObject({
        code: "FicheAvenir",
        label: "fiche Avenir",
        text: "Avis positif",
        maxCharacters: 600,
      });
      expect(result.data?.classes[0]?.students[0]?.subjects[0]?.competencies[0]).toEqual({
        code: "0431",
        label: "Argumenter",
        evaluationCode: "-1",
        evaluationLabel: "Aucune évaluation",
        order: 1,
      });
    });
  });
});