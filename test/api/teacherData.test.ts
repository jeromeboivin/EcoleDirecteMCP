import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeTeacherAttendanceResponse } from "../../src/ecoledirecte/api/teacherAttendance.js";
import { normalizeTeacherClassStudentsResponse } from "../../src/ecoledirecte/api/teacherClassStudents.js";
import { normalizeTeacherRoomsResponse } from "../../src/ecoledirecte/api/teacherRooms.js";
import { normalizeTeacherNoteSettingsResponse } from "../../src/ecoledirecte/api/teacherNoteSettings.js";
import { normalizeTeacherGradebookCatalogResponse } from "../../src/ecoledirecte/api/teacherGradebookCatalog.js";
import {
  normalizeTeacherGradebookAppreciationsResponse,
  normalizeTeacherGradebookPredefinedAppreciationsResponse,
} from "../../src/ecoledirecte/api/teacherGradebookAppreciations.js";
import { normalizeTeacherGradebookNotesResponse } from "../../src/ecoledirecte/api/teacherGradebookNotes.js";
import { normalizeTeacherCouncilResponse } from "../../src/ecoledirecte/api/teacherCouncil.js";

describe("teacher data normalizers", () => {
  describe("normalizeTeacherAttendanceResponse", () => {
    it("normalizes a teacher attendance roster payload", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: {
          eleves: [
            {
              id: 6099,
              prenom: "Irem",
              nom: "AKYOL",
              sexe: "F",
              classeId: 85,
              groupeId: 0,
              classeLibelle: "Premiere C",
              dateEntree: "2024-10-03",
              dateSortie: "",
              numeroBadge: "70990",
              regime: "Externe",
              email: "",
              portable: "0612345678",
              photo: "//photo.jpg",
              dateNaissance: "2009-09-30",
              estEnStage: false,
              estApprenant: false,
              dispense: true,
              finDispense: "2026-03-20",
              presenceObligatoire: true,
              absentAvant: true,
              dispositifs: [{ code: "ULIS", libelle: "ULIS" }],
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
          appelEnClasse: {
            effectue: true,
            dateHeure: "2026-03-15 13:28:01",
          },
        },
      };

      const result = normalizeTeacherAttendanceResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.studentCount).toBe(1);
      expect(result.data?.attendanceCall).toEqual({
        completed: true,
        recordedAt: "2026-03-15 13:28:01",
      });
      expect(result.data?.entity).toEqual({
        id: 85,
        type: "C",
        code: "1C",
        label: "Premiere C",
        isFlexible: false,
        isPrimary: false,
      });
      expect(result.data?.students[0]).toMatchObject({
        id: 6099,
        name: "Irem AKYOL",
        firstName: "Irem",
        lastName: "AKYOL",
        classId: 85,
        groupId: 0,
        className: "Premiere C",
        badgeNumber: "70990",
        boarderStatus: "Externe",
        mobile: "0612345678",
        birthDate: "2009-09-30",
        inStage: false,
        apprentice: false,
        dispensed: true,
        dispensationEnd: "2026-03-20",
        presenceRequired: true,
        absentBefore: true,
        devices: [{ code: "ULIS", label: "ULIS" }],
      });
    });

    it("returns failure for non-OK code", () => {
      const raw: RawApiResponse = {
        code: ApiCode.EXPIRED_KEY,
        token: "",
        message: "Session expired",
        data: {},
      };

      const result = normalizeTeacherAttendanceResponse(raw);

      expect(result.ok).toBe(false);
      expect(result.message).toBe("Session expired");
    });
  });

  describe("normalizeTeacherClassStudentsResponse", () => {
    it("normalizes a class roster array", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [
          {
            id: 101,
            prenom: "Alice",
            nom: "DUPONT",
            sexe: "F",
            classe: { id: 42, libelle: "3ème A", code: "3A" },
            photo: "//photo.jpg",
          },
          {
            id: 102,
            prenom: "Bob",
            nom: "MARTIN",
            sexe: "M",
          },
        ],
      };

      const result = normalizeTeacherClassStudentsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.students).toHaveLength(2);
      expect(result.data?.students[0]).toMatchObject({
        id: 101,
        name: "Alice DUPONT",
        firstName: "Alice",
        lastName: "DUPONT",
        sexe: "F",
        classId: 42,
        className: "3ème A",
        classCode: "3A",
        photo: "//photo.jpg",
      });
      expect(result.data?.students[1]).toMatchObject({
        id: 102,
        name: "Bob MARTIN",
        firstName: "Bob",
        lastName: "MARTIN",
        sexe: "M",
      });
      expect(result.data?.students[1]?.classId).toBeUndefined();
    });

    it("skips entries without a numeric id", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [{ prenom: "Ghost", nom: "STUDENT" }],
      };

      const result = normalizeTeacherClassStudentsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.students).toHaveLength(0);
    });

    it("returns failure for non-OK code", () => {
      const raw: RawApiResponse = {
        code: ApiCode.EXPIRED_KEY,
        token: "",
        message: "Session expired",
        data: [],
      };

      const result = normalizeTeacherClassStudentsResponse(raw);

      expect(result.ok).toBe(false);
      expect(result.message).toBe("Session expired");
    });
  });

  describe("normalizeTeacherRoomsResponse", () => {
    it("normalizes rooms with French field names", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [
          {
            id: 1,
            code: "S101",
            libelle: "Salle 101",
            batiment: "Bâtiment A",
            etage: "1er",
            reservable: true,
          },
          {
            id: 2,
            code: "CDI",
            libelle: "CDI",
            reservable: false,
          },
        ],
      };

      const result = normalizeTeacherRoomsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.rooms).toHaveLength(2);
      expect(result.data?.rooms[0]).toMatchObject({
        id: 1,
        code: "S101",
        label: "Salle 101",
        building: "Bâtiment A",
        floor: "1er",
        reservable: true,
      });
      expect(result.data?.rooms[1]).toMatchObject({
        id: 2,
        code: "CDI",
        label: "CDI",
        reservable: false,
      });
      expect(result.data?.rooms[1]?.building).toBeUndefined();
    });
  });

  describe("normalizeTeacherNoteSettingsResponse", () => {
    it("normalizes composantes, typesDevoirs, and etabsParams", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: {
          composantes: [
            { code: "ECRIT", libelle: "Écrit", coef: 1 },
            { code: "ORAL", libelle: "Oral", coef: 0.5 },
          ],
          typesDevoirs: [
            { code: "DS", libelle: "Devoir surveillé" },
            { code: "DM", libelle: "Devoir maison" },
          ],
          etabsParams: [
            { idEtab: 42, noteSur: 20, noteNegativeCompte: true, coefficientDefaut: 1 },
          ],
        },
      };

      const result = normalizeTeacherNoteSettingsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.components).toEqual([
        { code: "ECRIT", label: "Écrit", coefficient: 1 },
        { code: "ORAL", label: "Oral", coefficient: 0.5 },
      ]);
      expect(result.data?.homeworkTypes).toEqual([
        { code: "DS", label: "Devoir surveillé" },
        { code: "DM", label: "Devoir maison" },
      ]);
      expect(result.data?.establishmentParams).toEqual([
        { establishmentId: 42, maxGrade: 20, noteNegativeCount: true, defaultCoefficient: 1 },
      ]);
    });

    it("returns empty arrays when data has no recognized keys", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: {},
      };

      const result = normalizeTeacherNoteSettingsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.components).toEqual([]);
      expect(result.data?.homeworkTypes).toEqual([]);
      expect(result.data?.establishmentParams).toEqual([]);
    });

    it("returns empty arrays when data is undefined", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: undefined,
      };

      const result = normalizeTeacherNoteSettingsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.components).toEqual([]);
    });
  });

  describe("normalizeTeacherGradebookCatalogResponse", () => {
    it("normalizes a full catalog with establishments, classes, groups, and periods", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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
                classes: [
                  {
                    idGroupe: 85,
                    code: "3PA",
                    libelle: "3ème Prépa Apprenti",
                    typeEntity: "C",
                    tabPP: [{ idPP: 221 }],
                    periodes: [
                      {
                        codePeriode: "A001",
                        libelle: "Trimestre 1",
                        dateConseil: "2025-12-05",
                        saisieAppreciation: true,
                        matieres: [
                          { code: "FRANC", libelle: "Français", avecNotation: true, isEditable: true },
                          { code: "MATHS", libelle: "Mathématiques", avecNotation: true, isEditable: false },
                        ],
                      },
                    ],
                  },
                ],
                groupes: [
                  {
                    idGroupe: 200,
                    code: "VICLA_TG6",
                    libelle: "Vie de classe TG6",
                    typeEntity: "G",
                    periodes: [
                      {
                        codePeriode: "A001",
                        libelle: "Trimestre 1",
                        saisieAppreciation: false,
                        matieres: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = normalizeTeacherGradebookCatalogResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.establishments).toHaveLength(1);
      expect(result.data?.establishments[0]).toMatchObject({
        id: 6,
        code: "LP",
        label: "Lycée Pro",
      });

      const classes = result.data!.establishments[0].classes;
      expect(classes).toHaveLength(1);
      expect(classes[0]).toMatchObject({
        id: 85,
        code: "3PA",
        label: "3ème Prépa Apprenti",
        typeEntity: "C",
        isPP: true,
      });
      expect(classes[0].periods).toHaveLength(1);
      expect(classes[0].periods[0]).toMatchObject({
        code: "A001",
        label: "Trimestre 1",
        councilDate: "2025-12-05",
        appreciationOpen: true,
      });
      expect(classes[0].periods[0].subjects).toEqual([
        { code: "FRANC", label: "Français", hasGrading: true, isEditable: true },
        { code: "MATHS", label: "Mathématiques", hasGrading: true, isEditable: false },
      ]);

      const groups = result.data!.establishments[0].groups;
      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({
        id: 200,
        code: "VICLA_TG6",
        typeEntity: "G",
        label: "Vie de classe TG6",
      });
      expect(groups[0].periods[0].appreciationOpen).toBe(false);

      expect(result.data?.attendanceGrid).toEqual([
        { start: "08:00", end: "08:55" },
        { start: "09:00", end: "09:55" },
      ]);
    });

    it("returns empty arrays when data is an empty array", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [],
      };

      const result = normalizeTeacherGradebookCatalogResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.establishments).toEqual([]);
      expect(result.data?.attendanceGrid).toEqual([]);
    });

    it("skips establishments without a numeric id", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [{ code: "LP", nom: "Ghost" }],
      };

      const result = normalizeTeacherGradebookCatalogResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.establishments).toHaveLength(0);
    });

    it("marks isPP false when tabPP is empty", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: [
          {
            id: 2,
            niveaux: [{
              classes: [{
                idGroupe: 42,
                typeEntity: "C",
                tabPP: [],
                periodes: [],
              }],
              groupes: [],
            }],
          },
        ],
      };

      const result = normalizeTeacherGradebookCatalogResponse(raw);

      expect(result.data?.establishments[0].classes[0].isPP).toBe(false);
    });

    it("normalizes the nested live niveauxListe shape with top-level groups", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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
                      id: 67,
                      idGroupe: 67,
                      code: "TA",
                      libelle: "Terminale A",
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
                            {
                              code: "VICLA",
                              libelle: "Vie de classe",
                              libelleCourt: "VICLA",
                              avecNotation: true,
                              isEditable: "Si non vide",
                            },
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

      const result = normalizeTeacherGradebookCatalogResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.establishments).toHaveLength(1);
      expect(result.data?.establishments[0]?.label).toBe("Lycée Pro");
      expect(result.data?.establishments[0]?.groups).toEqual([
        {
          id: 1505,
          code: "VICLA_TG6",
          label: "Vie de classe TG6",
          typeEntity: "G",
          periods: [
            {
              code: "A003",
              label: "Trimestre 3",
              state: "ouvert",
              appreciationOpen: true,
              classAppreciationOpen: true,
              subjects: [],
            },
          ],
        },
      ]);
      expect(result.data?.establishments[0]?.classes[0]?.periods[0]).toMatchObject({
        code: "A003",
        shortLabel: "T3",
        state: "ouvert",
        councilDate: "2026-05-31",
        startDate: "2026-02-23",
        endDate: "2026-05-30",
        appreciationOpen: true,
        classAppreciationOpen: true,
      });
      expect(result.data?.establishments[0]?.classes[0]?.periods[0]?.subjects[0]).toMatchObject({
        code: "VICLA",
        shortLabel: "VICLA",
        isEditable: true,
        editability: "Si non vide",
      });
      expect(result.data?.attendanceGrid).toEqual([{ start: "08:00", end: "08:55" }]);
    });

    it("returns failure for non-OK code", () => {
      const raw: RawApiResponse = {
        code: ApiCode.EXPIRED_KEY,
        token: "",
        message: "Token invalide !",
        data: [],
      };

      const result = normalizeTeacherGradebookCatalogResponse(raw);

      expect(result.ok).toBe(false);
      expect(result.message).toBe("Token invalide !");
    });
  });

  describe("normalizeTeacherGradebookNotesResponse", () => {
    it("normalizes evaluations and per-student note cells", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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
              elementsProgramme: [{ id: 1 }],
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
                  elementsProgramme: [{ id: 1 }],
                },
              },
            },
          ],
        },
      };

      const result = normalizeTeacherGradebookNotesResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.evaluationCount).toBe(1);
      expect(result.data?.studentCount).toBe(1);
      expect(result.data?.evaluations[0]).toMatchObject({
        id: 18877181,
        teacherId: 221,
        teacherName: "Mme D. PROF",
        label: "Ecrit",
        coefficient: 3,
        periodId: "A002X001",
        subjectCode: "FRANC",
        homeworkType: { code: "BB", label: "Bac blanc" },
      });
      expect(result.data?.students[0]).toMatchObject({
        student: {
          id: 6099,
          name: "Irem AKYOL",
          classLabel: "Premiere C",
          classCode: "1C",
        },
      });
      expect(result.data?.students[0]?.grades["18877181"]).toMatchObject({
        noteId: 46193197,
        evaluationId: 18877181,
        grade: "8",
        maxGrade: 20,
        evaluationLabel: "Ecrit",
      });
    });
  });

  describe("teacher gradebook appreciations normalizers", () => {
    it("normalizes per-student appreciation periods and decodes base64 content", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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
                  appreciations: [
                    {
                      code: "APP1",
                      libelle: "",
                      contenu: "QnJhdm8gLSBjb250aW51ZSE=",
                    },
                  ],
                  positionSSMat: [],
                  elementsProgramme: [],
                },
              ],
            },
          ],
        },
      };

      const result = normalizeTeacherGradebookAppreciationsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.studentCount).toBe(1);
      expect(result.data?.students[0]).toMatchObject({
        id: 6099,
        name: "Irem AKYOL",
        classCode: "1C",
      });
      expect(result.data?.students[0]?.periods[0]).toMatchObject({
        code: "A002",
        label: "Trimestre 2",
        shortLabel: "T2",
        average: "11,05",
        open: false,
        averageCalculatedAt: "12/03/2026 à 08h01",
      });
      expect(result.data?.students[0]?.periods[0]?.appreciations[0]).toEqual({
        code: "APP1",
        content: "Bravo - continue!",
      });
    });

    it("normalizes predefined appreciations and decodes labels", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
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
          parametrage: {
            nbCaractMax: 200,
          },
        },
      };

      const result = normalizeTeacherGradebookPredefinedAppreciationsResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.maxCharacters).toBe(200);
      expect(result.data?.predefinedAppreciations).toEqual([
        {
          id: 2,
          code: "TB",
          label: "C'est très bien,",
          type: "Enseignant",
          authorId: 221,
        },
      ]);
    });
  });

  describe("normalizeTeacherCouncilResponse", () => {
    it("normalizes council students, settings, and decodes appreciations", () => {
      const raw: RawApiResponse = {
        code: ApiCode.OK,
        token: "",
        message: "",
        data: {
          eleves: [
            {
              id: 5517,
              prenom: "Maxime",
              nom: "BISI",
              photo: "//photo.jpg",
              ordreArrivee: "A",
              sexe: "M",
              dispositifs: [],
              appreciationPP: {
                id: "5517,Prof Principal,A003,",
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

      const result = normalizeTeacherCouncilResponse(raw);

      expect(result.ok).toBe(true);
      expect(result.data?.studentCount).toBe(1);
      expect(result.data?.students[0]).toMatchObject({
        id: 5517,
        name: "Maxime BISI",
        appreciationPP: {
          id: "5517,Prof Principal,A003,",
          text: "Bravo pour les efforts!",
        },
        mentionDuConseil: {
          id: "2",
          label: "Encouragements",
        },
      });
      expect(result.data?.settings).toEqual({
        principalProfessorCanEditSchoolLife: true,
        principalProfessorCanEditAll: true,
        classAppreciationEditable: true,
        principalProfessorMaxCharacters: 400,
        mentionOptions: [{ id: 2, label: "Encouragements", lineNumber: 1 }],
        appreciationSettings: [{ code: "APP1", id: 1, label: "Appréciation générale", maxCharacters: 200 }],
      });
      expect(result.data?.generalAppreciation).toEqual({
        id: "APP1",
        code: "APP1",
        label: "Appréciation générale",
        date: "2026-03-15 14:09:02",
        text: "Classe investie.",
      });
    });
  });
});
