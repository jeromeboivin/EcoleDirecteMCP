import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthService } from "../../src/ecoledirecte/auth/service.js";
import { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import { EdWriteService, WriteOutcomeUnknown } from "../../src/ecoledirecte/write/service.js";

const target = { entityType: "C", entityId: 55, subjectCode: "MATH", periodCode: "A002" };
const year = "2026-2027";
const quiz = { id: 22, idAuteur: 10, evaluations: [{ id: 31, idEntite: 42 }], travauxafaire: [] };
const form = { id: 23, idAuteur: 10, typeAuteur: "P", reviewState: 0, participants: [] };
const evaluation = { id: 24, libelle: "TP", date: "2026-11-23", idProf: 10, idPeriode: "A002", statutPeriode: "ouvert", codeMatiere: "MATH", noteSur: 20, coef: 1 };
const slot = { entityType: "C", entityId: 55, entityCode: "2D", subjectCode: "MATH", date: "2026-11-23" };
const rawSlot = { ...slot, matiereCode: slot.subjectCode, idCDT: 30, travailAFaire: true,
  aFaire: { idCDT: 30, contenu: Buffer.from("<p>ancien</p>").toString("base64"), documents: [{ id: "file.pdf", libelle: "Exercice.pdf" }],
    liensManuel: [] }, seance: { contenu: "lesson" } };

function service(role = "P", enabled = true) {
  const http = new EdHttpClient({ version: "4.104.4" });
  http.setToken("fake-token");
  const state = { status: "authenticated", accounts: [{ id: 10, type: role, name: "Test", current: true, students: [{ id: 49 }] }] };
  return new EdWriteService(http, { getState: () => state, getActiveProfile: () => "test" } as unknown as AuthService, enabled);
}

function response(data?: unknown) { return Response.json({ code: 200, data }); }

describe("extended browser-backed writes (offline mock transport)", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  async function execute(operation: Record<string, unknown>, role = "P") {
    const writer = service(role);
    const plan = await writer.prepare({ accountId: 10, ...operation });
    expect(fetchMock).not.toHaveBeenCalled();
    return writer.execute(plan.planId, true);
  }

  function wire(index = fetchMock.mock.calls.length - 1) {
    const [url, request] = fetchMock.mock.calls[index];
    expect(request).toMatchObject({ method: "POST", redirect: "manual", headers: { "X-Token": "fake-token" } });
    return { url: String(url), body: JSON.parse(new URLSearchParams(String(request?.body)).get("data")!) };
  }

  it.each([
    ["mark_read", "marquerCommeLu"], ["mark_unread", "marquerCommeNonLu"], ["archive", "archiver"], ["unarchive", "desarchiver"],
  ])("maps mailbox action %s and scopes the mutation to the active family", async (action, french) => {
    fetchMock.mockResolvedValueOnce(response());
    await expect(execute({ kind: "manage_messages", change: { action, messageIds: [1, 2], messagesYear: year } }, "1")).resolves.toMatchObject({ status: "applied" });
    expect(wire()).toEqual({ url: "https://api.ecoledirecte.com/v3/familles/10/messages.awp?verbe=put&v=4.104.4",
      body: { action: french, ids: [1, 2], anneeMessages: year } });
  });

  it.each([
    [{ action: "cancel", dossierId: -2, messageIds: [1], messagesYear: year }, "delete", { action: "annuler", ids: [1], idDossier: -2, anneeMessages: year }],
    [{ action: "delete", dossierId: -3, messageIds: [1], messagesYear: year }, "delete", { action: "supprimer", ids: [1], idDossier: -3, anneeMessages: year }],
    [{ action: "move", folderId: 9, messages: [{ id: 1, dossierId: -1 }] }, "put", { action: "deplacer", idClasseur: 9, ids: ["1:-1"] }],
    [{ action: "reschedule", messageId: 1, messagesYear: year, sendAt: "2026-12-01 10:00:00" }, "put",
      { action: "differer", ids: [1], anneeMessages: year, newDate: "2026-12-01 10:00:00" }],
  ] as const)("uses the exact browser message body for %j", async (change, verb, body) => {
    fetchMock.mockResolvedValueOnce(response());
    await execute({ kind: "manage_messages", change }, "A");
    expect(wire()).toEqual({ url: `https://apip.ecoledirecte.com/v3/personnels/10/messages.awp?verbe=${verb}&v=4.104.4`, body });
  });

  it.each([
    [{ kind: "create_message_folder", label: "Collège" }, "/messagerie/classeurs.awp?verbe=post", { libelle: "Collège" }],
    [{ kind: "rename_message_folder", folderId: 9, label: "Collège" }, "/messagerie/classeur/9.awp?verbe=put", { id: 9, libelle: "Collège", type: "classeur", icon: "folder" }],
    [{ kind: "set_message_signature", signature: "M & M\n<école>" }, "/signatureMessage.awp?verbe=put", { value: "<p>M &amp; M<br>&lt;école&gt;</p>" }],
    [{ kind: "create_workspace_topic", workspaceId: 2, title: "Informations" }, "/P/10/espacestravail/2/topics.awp?verbe=post", { idEspace: 2, titre: "Informations" }],
  ] as const)("supports standalone operation %j", async (operation, path, body) => {
    fetchMock.mockResolvedValueOnce(response({ id: 9 }));
    await execute(operation);
    expect(wire()).toEqual({ url: `https://apip.ecoledirecte.com/v3${path}&v=4.104.4`, body });
  });

  it("creates a draft without a recipient and never treats it as a send", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: 1 }));
    await execute({ kind: "send_message", subject: "Brouillon", text: "Document à revoir", recipients: [], delivery: { mode: "draft" } });
    expect(wire().body.message).toMatchObject({ brouillon: true, groupesDestinataires: [] });
    expect(wire().body.message).not.toHaveProperty("date");
  });

  it("sets homework status for a child of the active profile only", async () => {
    const operation = { kind: "set_homework_completion", date: slot.date, homeworkId: 66, studentId: 49, expectedCompleted: false, completed: true };
    await expect(service("1").prepare({ ...operation, accountId: 10, studentId: 48 })).rejects.toThrow(/scope/);
    await expect(service("P").prepare({ ...operation, accountId: 10 })).rejects.toThrow(/scope/);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(response({ matieres: [{ id: 66, aFaire: { effectue: false } }] })).mockResolvedValueOnce(response());
    await expect(execute(operation, "1")).resolves.toMatchObject({ resourceId: 66 });
    expect(wire(0).url).toContain(`/Eleves/49/cahierdetexte/${slot.date}.awp?verbe=get`);
    expect(wire()).toEqual({ url: "https://api.ecoledirecte.com/v3/Eleves/49/cahierdetexte.awp?verbe=put&v=4.104.4",
      body: { idDevoirsEffectues: [66], idDevoirsNonEffectues: [] } });
  });

  it("edits a cahier side without modifying its attachments or the other side", async () => {
    fetchMock.mockResolvedValueOnce(response([rawSlot])).mockResolvedValueOnce(response());
    await execute({ kind: "manage_cahier_entry", slot, cahierId: 30, side: "afaire",
      change: { action: "edit", expectedHtml: "<p>ancien</p>", text: "nouveau" } });
    expect(wire().url).toContain(`/cahierdetexte/afaire/2D/MATH/${slot.date}.awp?verbe=put`);
    expect(wire().body).toMatchObject({ aFaire: { ...rawSlot.aFaire, contenu: Buffer.from("<p>nouveau</p>").toString("base64") }, seance: rawSlot.seance });
  });

  it("protects linked cahier material from whole-entry deletion", async () => {
    fetchMock.mockResolvedValueOnce(response([rawSlot]));
    await expect(execute({ kind: "manage_cahier_entry", slot, cahierId: 30, side: "afaire",
      change: { action: "delete", expectedHtml: "<p>ancien</p>" } })).rejects.toThrow(/linked material/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deletes only the exact preflight attachment", async () => {
    fetchMock.mockResolvedValueOnce(response([rawSlot])).mockResolvedValueOnce(response());
    await execute({ kind: "manage_cahier_entry", slot, cahierId: 30, side: "afaire",
      change: { action: "delete_attachment", attachmentId: "file.pdf", expectedName: "Exercice.pdf" } });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/cahierdetexte/fichiers/file.pdf.awp?verbe=delete"), body: rawSlot.aFaire.documents[0] });
  });

  it("associates a textbook link with the correct cahier side", async () => {
    fetchMock.mockResolvedValueOnce(response([rawSlot])).mockResolvedValueOnce(response());
    await execute({ kind: "manage_cahier_entry", slot, cahierId: 30, side: "afaire",
      change: { action: "add_textbook_link", url: "https://example.test/exercice", label: "Exercice" } });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/cahierdetexte/30/liensmanuels.awp?verbe=post"),
      body: { typeCDT: "T", urlLien: "https://example.test/exercice", urlLibelle: "Exercice" } });
  });

  it("writes only the selected student's appreciation field", async () => {
    fetchMock.mockResolvedValueOnce(response({ eleves: [{ eleve: { id: 2 }, periodes: [{ code: "A002", ouverte: true,
      appreciations: [{ code: "APP", contenu: Buffer.from("Ancien").toString("base64") }] }] }] })).mockResolvedValueOnce(response());
    await execute({ kind: "set_gradebook_appreciation", target, studentId: 2, code: "APP", expectedText: "Ancien", appreciation: "Très bien" });
    expect(wire(0).url).toContain("/periodes/ALL/");
    expect(wire()).toMatchObject({ url: expect.stringContaining("/periodes/A002/matieres/MATH%C2%A4/appreciations.awp?verbe=post"),
      body: { eleves: [{ idEleve: 2, appreciations: [{ code: "APP", contenu: Buffer.from("Très bien").toString("base64") }] }] } });
  });

  it("creates a base64 appreciation template on the browser's teacher route", async () => {
    fetchMock.mockResolvedValueOnce(response({ appreciations: [] })).mockResolvedValueOnce(response());
    await execute({ kind: "manage_appreciation_template", entityType: "C", entityId: 55, change: { action: "create", code: "TB", text: "Très bien" } });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/Enseignant/10/C/55/appreciationsPredefinies.awp?verbe=post"),
      body: { code: "TB", libelle: Buffer.from("Très bien").toString("base64") } });
  });

  it("never deletes an evaluation containing a zero grade", async () => {
    fetchMock.mockResolvedValueOnce(response({ devoirs: [evaluation], eleves: [{ eleve: { id: 1 }, devoirs: { 24: { note: "0" } } }] }));
    await expect(execute({ kind: "manage_gradebook_evaluation", target, evaluationId: 24,
      expectedLabel: "TP", expectedDate: evaluation.date, change: { action: "delete_ungraded" } })).rejects.toThrow(/recorded grade/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renames an owned evaluation while retaining grading settings", async () => {
    fetchMock.mockResolvedValueOnce(response({ devoirs: [evaluation] })).mockResolvedValueOnce(response());
    await execute({ kind: "manage_gradebook_evaluation", target, evaluationId: 24,
      expectedLabel: "TP", expectedDate: evaluation.date, change: { action: "rename", label: "TP 1" } });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/devoirs/24.awp?verbe=put"), body: { devoir: { ...evaluation, libelle: "TP 1" } } });
  });

  it("does not control a foreign QCM or a mismatched association", async () => {
    fetchMock.mockResolvedValueOnce(response([{ ...quiz, idAuteur: 20 }]));
    await expect(execute({ kind: "manage_quiz", quizId: 22, schoolYear: year, change: { action: "start", associationId: 31 } })).rejects.toThrow(/does not own/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ action: "start", associationId: 31 }, "/22.awp?verbe=patch", { action: "startQCM", idAssociation: 31 }],
    [{ action: "stop", associationId: 31 }, "/22.awp?verbe=patch", { action: "stopQCM", idAssociation: 31 }],
    [{ action: "associate", resourceType: "CDT", resourceId: 77 }, "/22/associations.awp?verbe=post", { idEntite: 77, typeEntite: "CDT" }],
    [{ action: "refresh_participants", associationId: 31 }, "/22/associations/31.awp?verbe=patch", { action: "refreshParticipants", idEntite: 42, typeEntite: "EVALUATION" }],
  ] as const)("supports quiz action %j", async (change, path, body) => {
    fetchMock.mockResolvedValueOnce(response([quiz])).mockResolvedValueOnce(response({ id: 32 }));
    await execute({ kind: "manage_quiz", quizId: 22, schoolYear: year, change });
    expect(wire(0).body).toEqual({ anneeQCMs: year });
    expect(wire()).toEqual({ url: `https://apip.ecoledirecte.com/v3/enseignants/10/qcms${path}&v=4.104.4`, body });
  });

  it("creates a quiz without publishing it", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: 22 }));
    await execute({ kind: "create_quiz", title: "Fractions", introduction: "<exemple>" });
    expect(wire().body.qcm).toMatchObject({ titre: "Fractions", idAuteur: 10, id: 0, evaluations: [], travauxafaire: [] });
    expect(Buffer.from(wire().body.qcm.introduction, "base64").toString()).toBe("<p>&lt;exemple&gt;</p>");
  });

  it("adds a radio question with explicitly designated correct choices", async () => {
    fetchMock.mockResolvedValueOnce(response([{ ...quiz, evaluations: [] }])).mockResolvedValueOnce(response([{ id: 1, ordre: 16384 }]))
      .mockResolvedValueOnce(response({ id: 3 }));
    await execute({ kind: "manage_question", owner: "qcm", ownerId: 22, schoolYear: year, change: { action: "add_choice", title: "2 + 2", multiple: false,
      choices: [{ text: "4", correct: true }, { text: "5" }] } });
    expect(wire().body).toMatchObject({ duplicate: false, question: { ordre: 32768, typeQ: "radio", propositions: [{ valide: true }, { valide: false }] } });
  });

  it("persists an EDForms draft with explicit participants, then supports publishing separately", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: 23 }));
    await execute({ kind: "create_edform_draft", title: "Sondage", formType: "survey", participants: [{ id: 49, role: "E" }] });
    expect(wire().body.fs).toMatchObject({ typeF: "s", reviewState: 0, signature: false, participants: [{ id: 0, idUser: 49, typeUser: "E" }] });
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(response({ forms: [form] })).mockResolvedValueOnce(response());
    await execute({ kind: "manage_edform", formId: 23, schoolYear: year, change: { action: "publish", notify: false } });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/edforms/23.awp?verbe=patch"), body: { action: "startFS", activerNotification: false } });
  });

  it("validates an entire same-day attendance roster and preserves its existing flags", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-23T09:00:00Z"));
    const operation = { kind: "submit_class_attendance", date: slot.date, entityType: "C", entityId: 55, courseId: 6,
      startTime: "10:00", endTime: "11:00", students: [{ studentId: 1, status: "absent" }, { studentId: 2, status: "unchanged" }] };
    fetchMock.mockResolvedValueOnce(response([{ id: 6, classeId: 55, start_date: `${slot.date} 10:00`, end_date: `${slot.date} 11:00` }]))
      .mockResolvedValueOnce(response({ appelEnClasse: { effectue: false }, entity: { id: 55, type: "C" }, eleves: [{ id: 1 }, { id: 2, absentAvant: true }] }))
      .mockResolvedValueOnce(response());
    await expect(execute(operation)).resolves.toMatchObject({ resourceId: 6 });
    expect(wire(1)).toMatchObject({ url: expect.stringContaining("classes/55/eleves.awp?verbe=get&idCours=6"), body: { heureDebut: "10:00", heureFin: "11:00" } });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/classes/55/appel/horaires/10:00-11:00.awp?verbe=post"),
      body: { eleves: [{ id: 1, isAbsent: true, isEnRetard: false }, { id: 2, absentAvant: true }] } });
  });

  it("posts a workspace message only to the verified topic", async () => {
    fetchMock.mockResolvedValueOnce(response({ topics: [{ id: 5, titre: "Travail" }] })).mockResolvedValueOnce(response({ id: "msg-21" }));
    await expect(execute({ kind: "manage_workspace_topic", workspaceId: 4, topicId: 5, expectedTitle: "Travail",
      change: { action: "post_message", message: "Bonjour" } })).resolves.toMatchObject({ resourceId: "msg-21" });
    expect(wire()).toMatchObject({ url: expect.stringContaining("/P/10/espacestravail/4/topics/5/messages.awp?verbe=post"),
      body: { idTopic: 5, auteur: { idAuteur: 10, profil: "P" }, contenu: Buffer.from("<p>Bonjour</p>").toString("base64") } });
  });

  it("refuses a cloud mutation if the item was renamed since the preview", async () => {
    fetchMock.mockResolvedValueOnce(response([{ id: "root", type: "folder", children: [{ id: "doc", libelle: "Actual" }] }]));
    await expect(execute({ kind: "manage_cloud_node", change: { action: "trash", nodeId: "doc", expectedName: "Old" } })).rejects.toThrow(/missing, changed/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates folders and round-trips opaque cloud identifiers", async () => {
    fetchMock.mockResolvedValueOnce(response([{ id: "root", type: "folder", children: [{ id: "existing", libelle: "Autre" }] }]))
      .mockResolvedValueOnce(response({ id: "root\\Nouveau" }));
    await expect(execute({ kind: "manage_cloud_node", change: { action: "create_folder", name: "Nouveau" } }, "A"))
      .resolves.toMatchObject({ resourceId: "root\\Nouveau" });
    expect(wire()).toEqual({ url: "https://apip.ecoledirecte.com/v3/cloud/P/10.awp?verbe=post&v=4.104.4",
      body: { parentNode: { id: "root", type: "folder", children: [] }, libelle: "Nouveau", typeRessource: "folder" } });
  });

  it("keeps single-use and no-retry guarantees for the new actions", async () => {
    const writer = service();
    const plan = await writer.prepare({ kind: "create_message_folder", accountId: 10, label: "Test" });
    await expect(writer.execute(plan.planId, false)).rejects.toThrow(/confirmation/);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(writer.execute(plan.planId, true)).rejects.toBeInstanceOf(WriteOutcomeUnknown);
    await expect(writer.execute(plan.planId, true)).rejects.toThrow(/No matching write plan/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
