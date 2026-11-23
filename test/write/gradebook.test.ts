import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeTeacherGradebookCatalogResponse } from "../../src/ecoledirecte/api/teacherGradebookCatalog.js";
import { normalizeTeacherNoteSettingsResponse } from "../../src/ecoledirecte/api/teacherNoteSettings.js";
import type { AuthService } from "../../src/ecoledirecte/auth/service.js";
import { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import { EdWriteService, WriteOutcomeUnknown } from "../../src/ecoledirecte/write/service.js";

const accountId = 11;
const target = { entityType: "C", entityId: 42, periodCode: "A001", subjectCode: "PHY/CH+", subSubjectCode: "TP" };
const prefix = "https://apip.ecoledirecte.com/v3/enseignants/11/C/42/periodes/A001/matieres/PHY_______________CHPPPPPPPPPPPPPPP%C2%A4TP";
const evaluation = {
  id: 51, idProf: accountId, idPeriode: "A001", statutPeriode: "ouvert", codeMatiere: target.subjectCode, codeSSMatiere: "TP",
  libelle: "TP de chimie", coef: 2, noteSur: 20, date: "2026-11-20", dateAffichage: "2026-11-25", avecNote: true,
  notationLettre: false, noteNegative: false, nonSignificatif: false, ccf: false,
  commentaire: "Commentaire de l’évaluation", elementsProgramme: [{ id: 6, libelle: "Manipuler" }],
};
const selectedCell = { idNote: 99, idDevoir: evaluation.id, note: "12.5", lettre: "", coef: 3,
  commentaire: "Préserver ce commentaire", elementsProgramme: [{ id: 6, evaluation: "2" }] };
const untouchedCell = { idNote: 98, idDevoir: evaluation.id, note: "", lettre: "abs", commentaire: "Absence" };
const roster = [
  { eleve: { id: 1, nom: "Exemple", prenom: "A" }, devoirs: { "51": selectedCell } },
  { eleve: { id: 2, nom: "Exemple", prenom: "B", particule: "de" }, devoirs: { "51": untouchedCell } },
  { eleve: { id: 3, nom: "Exemple", prenom: "C" }, devoirs: [] },
  { eleve: { id: 4, nom: "Exemple", prenom: "D" }, devoirs: {} },
];
const period = {
  codePeriode: "A001", etat: "ouvert", dateDebut: "2026-09-01", dateFin: "2026-12-15",
  matieres: [
    { code: target.subjectCode, codeSSMatiere: "", avecNotation: true, avecSousMatiere: 1 },
    { code: target.subjectCode, codeSSMatiere: "TP", avecNotation: true, avecSousMatiere: 0 },
  ],
};
const catalog = { etablissements: [{ id: 7, niveaux: [{ classes: [{ id: 42, etabId: 7, estNote: 1, periodes: [period] }] }] }] };
const homeworkType = { id: 10, libelle: "Écrit", code: "ECR", coef: 2 };
const school = { id: 7, borneMax: 20, isTypeDevoirObligatoire: true, isBorneModifiable: false, isCoefModifiable: false,
  avecDecalage: "2", typesDevoirs: [homeworkType] };
const settings = { note: { etabsParams: [school], typesDevoirs: [homeworkType] } };

const creation = {
  kind: "create_gradebook_evaluation", accountId, target, label: "Exercice de TP", date: "2026-11-24",
  maxGrade: 20, coefficient: 2, homeworkTypeId: 10, publication: { mode: "date", date: "2026-11-28" },
};
const gradeChanges = {
  kind: "save_gradebook_notes", accountId, target, evaluationId: evaluation.id, evaluationLabel: evaluation.libelle,
  displayDate: evaluation.dateAffichage, maxGrade: 20, grades: [{ studentId: 1, previousGrade: "12,50", grade: "14,25" }],
};

function makeService(enabled = true, role = "P") {
  const http = new EdHttpClient({ version: "4.104.4" });
  http.setToken("test-token");
  const state = { status: "authenticated", token: "test-token", accounts: [{ id: accountId, type: role, current: true, name: "Test teacher" }] };
  const auth = { getState: () => state, getActiveProfile: () => "teacher" } as unknown as AuthService;
  return new EdWriteService(http, auth, enabled);
}

function response(data?: unknown, code = 200, headers?: HeadersInit) {
  return Response.json({ code, data }, { headers });
}

function formBody(options: RequestInit | undefined) {
  return JSON.parse(new URLSearchParams(String(options?.body)).get("data")!);
}

function grid(overrides: Record<string, unknown> = {}, students: unknown[] = roster) {
  return { devoirs: [{ ...evaluation, ...overrides }], eleves: students };
}

describe("teacher gradebook writes (mocked HTTP only)", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("Unexpected network call in offline test"));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses offline previews and rejects disabled writes and personnel sessions", async () => {
    const disabled = makeService(false);
    const preview = await disabled.prepare(creation);
    expect(preview).toMatchObject({ writesEnabled: false, operation: creation });
    await expect(disabled.execute(preview.planId, true)).rejects.toThrow(/disabled/);
    await expect(makeService(true, "A").prepare(gradeChanges)).rejects.toThrow(/teacher account/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a new evaluation once after checking availability, school policy and duplicates", async () => {
    const service = makeService();
    const { planId } = await service.prepare(creation);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(response(catalog))
      .mockResolvedValueOnce(response(settings))
      .mockResolvedValueOnce(response({ devoirs: [], eleves: roster }, 200, { "X-Token": "rotated" }))
      .mockResolvedValueOnce(response({ id: 52, afficheLe: "2026-11-28 09:00:00" }));
    await expect(service.execute(planId, false)).rejects.toThrow(/confirmation/);
    await expect(service.execute(planId, true)).resolves.toEqual({
      status: "applied", operation: "create_gradebook_evaluation", resourceId: 52, displayDate: "2026-11-28",
    });
    await expect(service.execute(planId, true)).rejects.toThrow(/No matching write plan/);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://apip.ecoledirecte.com/v3/niveauxListe.awp?verbe=get&v=4.104.4",
      "https://apip.ecoledirecte.com/v3/enseignants/11/parametrages.awp?verbe=get&v=4.104.4",
      `${prefix}/notes.awp?verbe=get&v=4.104.4`,
      `${prefix}/devoirs.awp?verbe=post&v=4.104.4`,
    ]);
    const [, init] = fetchMock.mock.calls[3];
    expect(init).toMatchObject({ method: "POST", redirect: "manual", headers: { "X-Token": "rotated" } });
    expect(formBody(init)).toEqual({ devoir: {
      libelle: "Exercice de TP", date: "2026-11-24", dateAffichage: "2026-11-28", commentaire: "",
      avecNote: true, noteSur: 20, coef: 2, typeDevoir: homeworkType,
      notationLettre: false, noteNegative: false, ccf: false, nonSignificatif: false, elementsProgramme: [],
    } });
  });

  it("supports a group and automatic publication when permitted, reporting the server's display date", async () => {
    const service = makeService();
    const { planId } = await service.prepare({ ...creation, publication: { mode: "school_policy" }, target: { ...target, entityType: "G" } });
    fetchMock.mockResolvedValueOnce(response({ ...catalog, groupes: [{ id: 42, etabId: 7, estNote: 1, periodes: [period] }] }))
      .mockResolvedValueOnce(response({ note: { etabsParams: [{ ...school, avecDecalage: "1" }] } }))
      .mockResolvedValueOnce(response(grid()))
      .mockResolvedValueOnce(response({ id: 52, afficheLe: "2026-12-03" }));
    await expect(service.execute(planId, true)).resolves.toMatchObject({ displayDate: "2026-12-03" });
    expect(String(fetchMock.mock.calls[3][0])).toContain("/enseignants/11/G/42/");
    expect(formBody(fetchMock.mock.calls[3][1]).devoir.dateAffichage).toBe("");
  });

  it.each([
    [{ publication: { mode: "school_policy" } }, /publication mode/],
    [{ maxGrade: 10 }, /scale/],
    [{ coefficient: 1 }, /coefficient/],
    [{ homeworkTypeId: 404 }, /evaluation type/],
    [{ homeworkTypeId: undefined }, /evaluation type/],
    [{ date: "2027-01-01" }, /outside the grading period/],
    [{ target: { ...target, subSubjectCode: undefined } }, /sub-subject/],
  ] as const)("refuses creation with incompatible context %j", async (patch, error) => {
    const service = makeService();
    const { planId } = await service.prepare({ ...creation, ...patch });
    fetchMock.mockResolvedValueOnce(response(catalog)).mockResolvedValueOnce(response(settings));
    await expect(service.execute(planId, true)).rejects.toThrow(error);
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes("verbe=get"))).toBe(true);
  });

  it("does not create another evaluation with the same label and date", async () => {
    const service = makeService();
    const { planId } = await service.prepare({ ...creation, label: evaluation.libelle, date: evaluation.date });
    fetchMock.mockResolvedValueOnce(response(catalog)).mockResolvedValueOnce(response(settings)).mockResolvedValueOnce(response(grid()));
    await expect(service.execute(planId, true)).rejects.toThrow(/already have an evaluation/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not create an evaluation in a closed period", async () => {
    const service = makeService();
    const { planId } = await service.prepare(creation);
    const closed = structuredClone(catalog);
    closed.etablissements[0].niveaux[0].classes[0].periodes[0].etat = "cloture";
    fetchMock.mockResolvedValueOnce(response(closed));
    await expect(service.execute(planId, true)).rejects.toThrow(/not confirmed open/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits a full column, preserving other students and metadata, then verifies the grades", async () => {
    const service = makeService();
    const preview = await service.prepare({ ...gradeChanges, grades: [...gradeChanges.grades, { studentId: 3, previousGrade: null, grade: "0" }] });
    expect(preview.operation).toMatchObject({ grades: [
      { studentId: 1, previousGrade: "12.50", grade: "14.25" }, { studentId: 3, previousGrade: null, grade: "0.00" },
    ] });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(response(grid())).mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response(grid({}, [
        { ...roster[0], devoirs: { "51": { ...selectedCell, note: "14,25" } } }, roster[1],
        { ...roster[2], devoirs: { "51": { idNote: 100, note: "0", lettre: "" } } }, roster[3],
      ])));
    await expect(service.execute(preview.planId, true)).resolves.toEqual({
      status: "applied", operation: "save_gradebook_notes", resourceId: 51, verifiedGradeCount: 2,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${prefix}/notes.awp?verbe=get&v=4.104.4`, `${prefix}/notes.awp?verbe=post&v=4.104.4`, `${prefix}/notes.awp?verbe=get&v=4.104.4`,
    ]);
    const body = formBody(fetchMock.mock.calls[1][1]);
    expect(body).toMatchObject({ devoirs: [{ ...evaluation, readOnly: false, eleves: [
      { id: 1, devoirs: [{ ...selectedCell, note: "14.25", isGoodNote: true }] },
      { id: 2, particule: "de", devoirs: [untouchedCell] },
      { id: 3, devoirs: [{ idDevoir: 51, note: "0.00", lettre: "", noteSur: 20, coef: 2 }] },
      { id: 4, devoirs: [] },
    ] }] });
    expect(body.devoirs[0].eleves[2].devoirs[0]).not.toHaveProperty("idNote");
  });

  it.each([
    [{ idProf: 77 }, /approved preview/],
    [{ statutPeriode: "cloture" }, /not confirmed open/],
    [{ notationLettre: true }, /numeric grading/],
    [{ readOnly: true }, /numeric grading/],
    [{ dateAffichage: "2026-12-01" }, /display date/],
    [{ noteSur: 10 }, /grade scale/],
    [{ codeSSMatiere: "COURSE" }, /approved preview/],
  ] as const)("does not post notes for a changed or ineligible evaluation (%j)", async (patch, error) => {
    const service = makeService();
    const { planId } = await service.prepare(gradeChanges);
    fetchMock.mockResolvedValueOnce(response(grid(patch)));
    await expect(service.execute(planId, true)).rejects.toThrow(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("verbe=get");
  });

  it.each([
    [{ studentId: 1, previousGrade: "11", grade: "14" }, /previous grade/],
    [{ studentId: 2, previousGrade: null, grade: "14" }, /non-numeric/],
    [{ studentId: 1, previousGrade: "12.50", grade: "-1" }, /outside/],
    [{ studentId: 999, previousGrade: null, grade: "14" }, /not in the current grade grid/],
  ] as const)("does not post notes for an incompatible cell (%j)", async (change, error) => {
    const service = makeService();
    const { planId } = await service.prepare({ ...gradeChanges, grades: [change] });
    fetchMock.mockResolvedValueOnce(response(grid()));
    await expect(service.execute(planId, true)).rejects.toThrow(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects erasure, duplicate students, too-high grades and the annual aggregate without any requests", async () => {
    const service = makeService();
    for (const grade of ["", "abs", "20.02", "12.500"]) {
      await expect(service.prepare({ ...gradeChanges, grades: [{ ...gradeChanges.grades[0], grade }] })).rejects.toThrow();
    }
    await expect(service.prepare({ ...gradeChanges, grades: [...gradeChanges.grades, ...gradeChanges.grades] })).rejects.toThrow(/Duplicate/);
    await expect(service.prepare({ ...creation, target: { ...target, periodCode: "A999Z" } })).rejects.toThrow(/aggregate/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never retries a failed mutation or reuses a consumed confirmation", async () => {
    const service = makeService();
    const { planId } = await service.prepare(gradeChanges);
    fetchMock.mockResolvedValueOnce(response(grid())).mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(service.execute(planId, true)).rejects.toBeInstanceOf(WriteOutcomeUnknown);
    await expect(service.execute(planId, true)).rejects.toThrow(/No matching write plan/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses a grade above a student's individual scale without posting", async () => {
    const service = makeService();
    const { planId } = await service.prepare(gradeChanges);
    fetchMock.mockResolvedValueOnce(response(grid({}, [{ ...roster[0], devoirs: { "51": { ...selectedCell, noteSur: "13" } } }, ...roster.slice(1)])));
    await expect(service.execute(planId, true)).rejects.toThrow(/outside the permitted scale/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an uncertain outcome when the post is accepted but the readback does not match", async () => {
    const service = makeService();
    const { planId } = await service.prepare(gradeChanges);
    fetchMock.mockResolvedValueOnce(response(grid())).mockResolvedValueOnce(response()).mockResolvedValueOnce(response(grid()));
    await expect(service.execute(planId, true)).rejects.toBeInstanceOf(WriteOutcomeUnknown);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("verbe=post"))).toHaveLength(1);
  });
});

it("exposes school grading rules and distinct sub-subjects in the existing read tools", () => {
  const settingsView = normalizeTeacherNoteSettingsResponse({ code: 200, token: "", message: "", data: settings });
  expect(settingsView.data?.establishmentParams).toEqual([{
    establishmentId: 7, maxGrade: 20, noteNegativeCount: false, scaleEditable: false, coefficientEditable: false,
    homeworkTypeRequired: true, publicationMode: "date", homeworkTypes: [{ id: 10, label: "Écrit", code: "ECR", coefficient: 2 }],
  }]);
  const catalogView = normalizeTeacherGradebookCatalogResponse({ code: 200, token: "", message: "", data: catalog });
  expect(catalogView.data?.establishments[0].classes[0].periods[0].subjects).toMatchObject([
    { code: target.subjectCode, hasSubSubjects: true }, { code: target.subjectCode, subSubjectCode: "TP" },
  ]);
});
