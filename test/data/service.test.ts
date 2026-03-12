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
  };
}

const authenticatedState: AuthState = {
  status: "authenticated",
  token: "tok",
  accounts: [
    {
      id: 828,
      type: "1",
      name: "Anne Roudier-Boivin",
      establishment: "Les Marronniers",
      main: true,
      students: [{ id: 1154, name: "Antonin Boivin", className: "3B" }],
    },
    {
      id: 17405,
      type: "1",
      name: "Anne Roudier-Boivin",
      establishment: "Institution Robin",
      students: [{ id: 15902, name: "Jules Boivin", className: "Première 2" }],
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
});