import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeNotesResponse } from "../../src/ecoledirecte/api/notes.js";

describe("normalizeNotesResponse", () => {
  it("normalizes period summaries and student grades", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        parametrage: {
          moyenneEleve: true,
          moyenneClasse: true,
          moyenneMin: true,
          moyenneMax: false,
          moyenneGenerale: true,
          coefficientNote: true,
        },
        periodes: [
          {
            idPeriode: "P1",
            codePeriode: "A001",
            periode: "Trimestre 1",
            dateDebut: "2025-09-01",
            dateFin: "2025-12-20",
            annuel: false,
            cloture: true,
            examenBlanc: false,
            salleConseil: "B12",
            ensembleMatieres: {
              moyenneGenerale: "15.4",
              moyenneClasse: "13.9",
              moyenneMin: "8.2",
              moyenneMax: "17.8",
              dateCalcul: "2025-12-21 16:00",
              disciplines: [],
            },
          },
        ],
        notes: [
          {
            id: 42,
            devoir: "Contrôle fractions",
            codePeriode: "A001",
            codeMatiere: "MATH",
            libelleMatiere: "Mathématiques",
            codeSousMatiere: "ALG",
            typeDevoir: "Devoir surveillé",
            enLettre: false,
            coef: "2",
            noteSur: "20",
            valeur: "16",
            nonSignificatif: false,
            date: "2025-10-14",
            dateSaisie: "2025-10-15",
            valeurisee: true,
            moyenneClasse: "12.5",
            minClasse: "6",
            maxClasse: "19",
            commentaire: "Très bien",
            elementsProgramme: [{ id: 1 }, { id: 2 }],
            qcm: { id: 9 },
            uncSujet: "unc-sujet",
            uncCorrige: "unc-corrige",
          },
        ],
        foStat: "PREMIERE_GENERALE",
      },
    };

    const result = normalizeNotesResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      settings: {
        studentAverage: true,
        classAverage: true,
        minAverage: true,
        maxAverage: false,
        generalAverage: true,
        coefficientNote: true,
      },
      periods: [
        {
          id: "P1",
          label: "Trimestre 1",
          code: "A001",
          startDate: "2025-09-01",
          endDate: "2025-12-20",
          annual: false,
          closed: true,
          exam: false,
          generalAverage: "15.4",
          classAverage: "13.9",
          minAverage: "8.2",
          maxAverage: "17.8",
          calculatedAt: "2025-12-21 16:00",
          councilRoom: "B12",
          disciplines: [],
        },
      ],
      grades: [
        {
          id: 42,
          assignment: "Contrôle fractions",
          subject: "Mathématiques",
          periodCode: "A001",
          subjectCode: "MATH",
          subSubjectCode: "ALG",
          type: "Devoir surveillé",
          value: "16",
          outOf: "20",
          coefficient: "2",
          classAverage: "12.5",
          minClass: "6",
          maxClass: "19",
          date: "2025-10-14",
          enteredAt: "2025-10-15",
          comment: "Très bien",
          isLetterGrade: false,
          isWeighted: true,
          nonSignificant: false,
          elementCount: 2,
          hasQcm: true,
          hasSubjectAttachment: true,
          hasCorrectionAttachment: true,
        },
      ],
      expired: false,
      classProfile: "PREMIERE_GENERALE",
    });
  });

  it("extracts per-subject disciplines with decoded appreciations", () => {
    const appreciationText = "Bon travail, continue ainsi.";
    const encodedAppreciation = Buffer.from(appreciationText).toString("base64");
    const classAppreciationText = "Classe sérieuse et investie.";
    const encodedClassAppreciation = Buffer.from(classAppreciationText).toString("base64");
    const ppText = "Élève appliqué.";
    const encodedPP = Buffer.from(ppText).toString("base64");

    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        parametrage: {},
        periodes: [
          {
            idPeriode: "P2",
            codePeriode: "A002",
            periode: "Trimestre 2",
            annuel: false,
            cloture: false,
            examenBlanc: false,
            ensembleMatieres: {
              moyenneGenerale: "14.0",
              moyenneClasse: "12.5",
              rang: 3,
              effectif: 28,
              appreciationPP: encodedPP,
              decisionDuConseil: "",
              disciplines: [
                {
                  id: 101,
                  codeMatiere: "FRANC",
                  codeSousMatiere: "",
                  discipline: "Français",
                  moyenne: "15.5",
                  moyenneClasse: "13.0",
                  moyenneMin: "8.0",
                  moyenneMax: "18.0",
                  coef: "3",
                  rang: 2,
                  effectif: 28,
                  groupeMatiere: false,
                  idGroupeMatiere: 0,
                  option: false,
                  sousMatiere: false,
                  professeurs: [
                    { id: 221, nom: "Mme ROUDIER BOIVIN" },
                  ],
                  appreciations: [encodedAppreciation],
                  appreciationClasse: encodedClassAppreciation,
                },
                {
                  id: 102,
                  codeMatiere: "MATH",
                  discipline: "Mathématiques",
                  moyenne: "12.0",
                  professeurs: [],
                  appreciations: [],
                  groupeMatiere: false,
                  option: true,
                  sousMatiere: false,
                },
              ],
            },
          },
        ],
        notes: [],
      },
    };

    const result = normalizeNotesResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data!.periods).toHaveLength(1);

    const period = result.data!.periods[0];
    expect(period.rank).toBe(3);
    expect(period.effectif).toBe(28);
    expect(period.appreciationPP).toBe(ppText);
    expect(period.councilDecision).toBeUndefined();

    expect(period.disciplines).toHaveLength(2);

    const french = period.disciplines[0];
    expect(french).toEqual({
      id: 101,
      code: "FRANC",
      name: "Français",
      average: "15.5",
      classAverage: "13.0",
      classMin: "8.0",
      classMax: "18.0",
      coefficient: "3",
      rank: 2,
      effectif: 28,
      teachers: [{ id: 221, name: "Mme ROUDIER BOIVIN" }],
      appreciations: [appreciationText],
      classAppreciation: classAppreciationText,
      isGroup: false,
      groupId: 0,
      isOption: false,
      isSubSubject: false,
    });

    const math = period.disciplines[1];
    expect(math.id).toBe(102);
    expect(math.code).toBe("MATH");
    expect(math.name).toBe("Mathématiques");
    expect(math.average).toBe("12.0");
    expect(math.teachers).toEqual([]);
    expect(math.appreciations).toEqual([]);
    expect(math.isOption).toBe(true);
  });

  it("returns an error for non-200 API codes", () => {
    const raw: RawApiResponse = {
      code: ApiCode.EXPIRED_KEY,
      token: "",
      message: "Session expirée",
    };

    const result = normalizeNotesResponse(raw);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Session expirée");
  });
});