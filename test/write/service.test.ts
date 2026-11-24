import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthService } from "../../src/ecoledirecte/auth/service.js";
import type { AuthState } from "../../src/ecoledirecte/auth/types.js";
import { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import { EdWriteService, WriteOutcomeUnknown } from "../../src/ecoledirecte/write/service.js";

const account = { id: 10, type: "P", current: true, name: "Test teacher" };
const message = {
  kind: "send_message", accountId: 10, subject: "Information & rappel", text: "Bonjour < classe\nRévision 🙂",
  recipients: [{ id: 20, role: "E" }, { id: 30, role: "2", kind: "cci", firstName: "Test" }],
};
const slot = { date: "2026-11-30", entityId: 40, entityType: "C", entityCode: "Classe A", subjectCode: "A/B+C", courseId: 50 };
const rawSlot = {
  date: slot.date, entityId: slot.entityId, entityType: slot.entityType, entityCode: slot.entityCode,
  matiereCode: slot.subjectCode, idCours: slot.courseId, travailAFaire: false, contenuDeSeance: false, interrogation: false,
};
const homework = { kind: "add_homework", accountId: 10, slot, assignedOn: "2026-11-23", text: "Page 12 : exercice 3." };
const lesson = { kind: "add_lesson_content", accountId: 10, slot, text: "Leçon sur les fractions." };

function init(enabled = true, role = "P") {
  const http = new EdHttpClient({ version: "4.104.4" });
  http.setToken("fake-token");
  http.setTwoFaToken("fake-2fa");
  http.setCookie("cookie", "fake-cookie");
  http.setGtk("fake-gtk");
  const state: AuthState = { status: "authenticated", token: "fake-token", accounts: [{ ...account, type: role }] };
  const auth = { getState: vi.fn<() => AuthState>().mockReturnValue(state), getActiveProfile: vi.fn(() => "staff") };
  return { service: new EdWriteService(http, auth as unknown as AuthService, enabled), auth, state };
}

function response(data: unknown, code = 200, headers?: HeadersInit) {
  return Response.json({ code, data }, { headers });
}

function postedForm(init: RequestInit | undefined) {
  return JSON.parse(new URLSearchParams(String(init?.body)).get("data")!);
}

describe("guarded ÉcoleDirecte writes (offline)", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let temp: string | undefined;

  beforeEach(() => {
    // Do not allow any test in this suite to open a network connection.
    fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("Unexpected request in offline test"));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (temp) await rm(temp, { recursive: true, force: true });
    temp = undefined;
  });

  async function makeFile() {
    temp = await mkdtemp(join(tmpdir(), "ed-write-test-"));
    const filePath = join(temp, "fiche.pdf");
    await writeFile(filePath, "fake PDF");
    return { kind: "attach_cahier_document", accountId: 10, slot, side: "afaire", cahierId: 60, filePath };
  }

  it("previews without HTTP and never executes with writes disabled", async () => {
    const { service } = init(false);
    const result = await service.prepare(message);
    expect(result).toMatchObject({ writesEnabled: false, sender: { id: 10, role: "P" }, operation: message });
    await expect(service.execute(result.planId, true)).rejects.toThrow(/disabled/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires confirmation, the current preview, and the same authenticated session", async () => {
    const { service, auth, state } = init();
    const previous = await service.prepare(message);
    const current = await service.prepare(lesson);
    await expect(service.execute(previous.planId, true)).rejects.toThrow(/No matching write plan/);
    await expect(service.execute(current.planId, false)).rejects.toThrow(/confirmation/);
    auth.getState.mockReturnValue({ ...state });
    await expect(service.execute(current.planId, true)).rejects.toThrow(/session changed/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses expired and cancelled plans without HTTP", async () => {
    const { service } = init();
    const plan = await service.prepare(message);
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(plan.expiresAt));
    await expect(service.execute(plan.planId, true)).rejects.toThrow(/expired/);
    const next = await service.prepare(message);
    await expect(service.execute(next.planId, true, AbortSignal.abort())).rejects.toThrow(/cancelled/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects wrong accounts, wrong roles, duplicate recipients and missing To", async () => {
    const { service } = init();
    await expect(service.prepare({ ...message, accountId: 999 })).rejects.toThrow(/currently active/);
    await expect(init(true, "1").service.prepare(message)).rejects.toThrow(/teacher or personnel/);
    await expect(init(true, "A").service.prepare(lesson)).rejects.toThrow(/teacher account/);
    await expect(service.prepare({ ...message, recipients: [message.recipients[1]] })).rejects.toThrow(/recipient must be in To/);
    await expect(service.prepare({ ...message, recipients: [message.recipients[0], message.recipients[0]] })).rejects.toThrow(/Duplicate/);
    await expect(service.prepare({ ...homework, assignedOn: "2026-02-30" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([["P", "enseignants"], ["A", "personnels"]])("sends once with a browser-shaped message for %s", async (role, path) => {
    const { service } = init(true, role);
    const preview = await service.prepare(message);
    fetchMock.mockResolvedValueOnce(response({ id: 100 }));
    await expect(service.execute(preview.planId, true)).resolves.toEqual({ status: "applied", operation: "send_message", resourceId: 100 });
    await expect(service.execute(preview.planId, true)).rejects.toThrow(/No matching write plan/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://apip.ecoledirecte.com/v3/${path}/10/messages.awp?verbe=post&v=4.104.4`);
    expect(options).toMatchObject({ method: "POST", redirect: "manual", headers: { "X-Token": "fake-token", "2FA-Token": "fake-2fa" } });
    const payload = postedForm(options);
    expect(payload).toMatchObject({ anneeMessages: "", message: {
      subject: message.subject, from: { role, id: 10, read: true }, brouillon: false, files: [], transfertFiles: [],
      groupesDestinataires: [
        { selection: { type: "E" }, destinataires: [{ id: 20, type: "E", to_cc_cci: "to" }] },
        { selection: { type: "1" }, destinataires: [{ id: 30, type: "2", to_cc_cci: "cci", prenom: "Test" }] },
      ],
    } });
    expect(Buffer.from(payload.message.content, "base64").toString()).toBe("<p>Bonjour &lt; classe<br>R&#233;vision &#128578;</p>");
  });

  it.each([
    ["network failure", () => Promise.reject(new TypeError("fetch failed")), true],
    ["expiry", () => Promise.resolve(response({}, 521)), false],
    ["redirect", () => Promise.resolve(new Response(null, { status: 302, headers: { Location: "https://example.invalid/" } })), true],
    ["missing confirmed ID", () => Promise.resolve(response({})), true],
  ] as const)("does not retry on %s and consumes the confirmation", async (_reason, failingResponse, unknown) => {
    const { service } = init();
    const { planId } = await service.prepare(message);
    fetchMock.mockImplementationOnce(failingResponse);
    const result = service.execute(planId, true);
    if (unknown) await expect(result).rejects.toBeInstanceOf(WriteOutcomeUnknown);
    else await expect(result).rejects.toThrow(/code 521/);
    await expect(service.execute(planId, true)).rejects.toThrow(/No matching write plan/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads the slot, adds homework, and retains opposite-side content", async () => {
    const { service } = init();
    const seance = { idCDT: 60, contenu: "existing", documents: [{ id: "f-1" }] };
    const { planId } = await service.prepare(homework);
    fetchMock.mockResolvedValueOnce(response([{ ...rawSlot, idCDT: 60, seance, contenuDeSeance: true }], 200, { "X-Token": "rotated" }))
      .mockResolvedValueOnce(response({ idCDT: 60 }));
    await expect(service.execute(planId, true)).resolves.toMatchObject({ resourceId: 60 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://apip.ecoledirecte.com/v3/cahierdetexte/loadslots/${slot.date}/${slot.date}.awp?verbe=get&v=4.104.4`);
    expect(fetchMock.mock.calls[1][0]).toBe(`https://apip.ecoledirecte.com/v3/cahierdetexte/afaire/Classe%20A/A_______________BPPPPPPPPPPPPPPPC/${slot.date}.awp?verbe=put&v=4.104.4`);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ "X-Token": "rotated" });
    expect(postedForm(fetchMock.mock.calls[1][1])).toMatchObject({ ...rawSlot, idCDT: 60, seance, contenuDeSeance: true, travailAFaire: true,
      aFaire: { contenu: Buffer.from("<p>Page 12 : exercice 3.</p>").toString("base64"), donneLe: homework.assignedOn, rendreEnLigne: false },
    });
  });

  it("adds lesson content on the seance side", async () => {
    const { service } = init();
    const { planId } = await service.prepare(lesson);
    fetchMock.mockResolvedValueOnce(response([rawSlot])).mockResolvedValueOnce(response({ idCDT: 60 }));
    await expect(service.execute(planId, true)).resolves.toMatchObject({ resourceId: 60 });
    expect(fetchMock.mock.calls[1][0]).toContain("/seance/");
    const saved = postedForm(fetchMock.mock.calls[1][1]);
    expect(saved.contenuDeSeance).toBe(true);
    expect(saved.aFaire).toBeUndefined();
    expect(Buffer.from(saved.seance.contenu, "base64").toString()).toBe("<p>Leçon sur les fractions.</p>");
  });

  it.each([
    [[{ ...rawSlot, aFaire: { documents: [{ id: "already-there" }] } }], /overwrite/],
    [[{ ...rawSlot, travailAFaire: true }], /overwrite/],
    [[{ ...rawSlot, travailAFaire: undefined }], /did not confirm/],
    [[rawSlot, { ...rawSlot, idCours: 99 }], /ambiguous/],
    [[{ ...rawSlot, isAnnule: true }], /cancelled/],
    [[{ ...rawSlot, idCours: 99 }], /changed/],
  ] as const)("sends no mutation for unsafe slot %j", async (data, error) => {
    const { service } = init();
    const { planId } = await service.prepare(homework);
    fetchMock.mockResolvedValueOnce(response(data));
    await expect(service.execute(planId, true)).rejects.toThrow(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("verbe=get");
  });

  it("uploads exactly the previewed bytes with the browser's multipart fields and auth", async () => {
    const operation = await makeFile();
    const { service } = init();
    const preview = await service.prepare(operation);
    expect(preview.operation).toMatchObject({ file: { name: "fiche.pdf", size: 8, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(response([{ ...rawSlot, idCDT: 60, travailAFaire: true }])).mockResolvedValueOnce(response({ id: "remote-file.pdf" }));
    await expect(service.execute(preview.planId, true)).resolves.toMatchObject({ resourceId: "remote-file.pdf" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe("https://api.ecoledirecte.com/v3/televersement.awp?verbe=post&mode=CDT");
    expect(options?.method).toBe("POST");
    expect(options?.redirect).toBe("manual");
    const headers = new Headers(options?.headers);
    expect(headers.get("X-Token")).toBe("fake-token");
    for (const name of ["Content-Type", "Cookie", "X-GTK", "2FA-Token"]) expect(headers.has(name)).toBe(false);
    const body = options?.body as FormData;
    const fields = { idContexte: 60, side: "afaire", dateSaisie: slot.date, idEntity: 40, typeEntity: "C", codeMatiere: "A/B+C" };
    expect(JSON.parse(String(body.get("data")))).toEqual(fields);
    for (const [key, value] of Object.entries(fields)) expect(body.get(key)).toBe(String(value));
    const file = body.get("file") as File;
    expect(file.name).toBe("fiche.pdf");
    expect(file.type).toBe("application/pdf");
    expect(await file.text()).toBe("fake PDF");
  });

  it("fails before any HTTP if the file changed or points to a symlink", async () => {
    const operation = await makeFile();
    const { service } = init();
    const { planId } = await service.prepare(operation);
    await writeFile(operation.filePath, "same len");
    await expect(service.execute(planId, true)).rejects.toThrow(/file changed/);
    const link = join(temp!, "link.pdf");
    await symlink(operation.filePath, link);
    await expect(service.prepare({ ...operation, filePath: link })).rejects.toThrow(/symlinks/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not upload if the current cahier ID changed", async () => {
    const operation = await makeFile();
    const { service } = init();
    const { planId } = await service.prepare(operation);
    fetchMock.mockResolvedValueOnce(response([{ ...rawSlot, idCDT: 61, travailAFaire: true }]));
    await expect(service.execute(planId, true)).rejects.toThrow(/no longer matches/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
