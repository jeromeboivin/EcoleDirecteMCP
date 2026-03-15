import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeTeacherClassStudentsResponse } from "../../src/ecoledirecte/api/teacherClassStudents.js";
import { normalizeTeacherRoomsResponse } from "../../src/ecoledirecte/api/teacherRooms.js";
import { normalizeTeacherNoteSettingsResponse } from "../../src/ecoledirecte/api/teacherNoteSettings.js";
import { normalizeTeacherGradebookCatalogResponse } from "../../src/ecoledirecte/api/teacherGradebookCatalog.js";

describe("teacher data normalizers", () => {
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
});
