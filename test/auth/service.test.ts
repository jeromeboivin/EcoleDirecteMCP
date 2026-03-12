import { describe, it, expect, vi } from "vitest";
import { AuthService } from "../../src/ecoledirecte/auth/service.js";
import type { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import type { AuthStore } from "../../src/ecoledirecte/auth/store.js";
import type { StoredSession } from "../../src/ecoledirecte/auth/types.js";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";

function mockResponse(body: RawApiResponse, headers?: Record<string, string>): Response {
  const h = new Headers(headers);
  if (!(h as Headers & { getSetCookie?: () => string[] }).getSetCookie) {
    (h as Headers & { getSetCookie: () => string[] }).getSetCookie = () => [];
  }
  return {
    json: () => Promise.resolve(body),
    headers: h,
  } as unknown as Response;
}

function successBody(opts?: { accounts?: unknown[]; token?: string }): RawApiResponse {
  return {
    code: ApiCode.OK,
    token: opts?.token ?? "body-token",
    message: "",
    data: {
      accounts:
        opts?.accounts ??
        [{ id: 1, typeCompte: "1", nom: "Doe", prenom: "Jane", nomEtablissement: "Lycee" }],
    },
  };
}

function switchableAccounts(): unknown[] {
  return [
    {
      id: 828,
      idLogin: 4229759,
      typeCompte: "1",
      nom: "ROUDIER-BOIVIN",
      prenom: "Anne",
      nomEtablissement: "Les Marronniers",
      main: true,
      current: true,
      profile: {
        eleves: [{ id: 1154, nom: "BOIVIN", prenom: "Antonin", classe: { id: 18, libelle: "3B", code: "3B" } }],
      },
    },
    {
      id: 17405,
      idLogin: 8955929,
      typeCompte: "1",
      nom: "ROUDIER-BOIVIN",
      prenom: "Anne",
      nomEtablissement: "Institution Robin",
      current: false,
      profile: {
        eleves: [{ id: 15902, nom: "BOIVIN", prenom: "Jules", classe: { id: 165, libelle: "Première 2", code: "12" } }],
      },
    },
  ];
}

function renewTokenBody(accountId: number): RawApiResponse {
  return {
    code: ApiCode.OK,
    token: "renew-body-token",
    message: "",
    data: { id: accountId },
  };
}

function totpLoginBody(): RawApiResponse {
  return {
    code: ApiCode.AUTH_2FA,
    token: "",
    message: "",
    data: { totp: true },
  };
}

function doubleAuthLoginBody(): RawApiResponse {
  return {
    code: ApiCode.AUTH_2FA,
    token: "body-intermediate-token",
    message: "",
    data: { totp: false },
  };
}

function doubleAuthQuestionBody(): RawApiResponse {
  return {
    code: ApiCode.OK,
    token: "",
    message: "",
    data: {
      question: Buffer.from("Quelle est l'annee ?").toString("base64"),
      propositions: [
        Buffer.from("2011").toString("base64"),
        Buffer.from("2012").toString("base64"),
      ],
    },
  };
}

function doubleAuthAnswerBody(): RawApiResponse {
  return {
    code: ApiCode.OK,
    token: "",
    message: "",
    data: {
      cn: "cn-token",
      cv: "cv-token",
    },
  };
}

function probeBody(token = "probe-body-token"): RawApiResponse {
  return {
    code: ApiCode.OK,
    token,
    message: "",
    data: [],
  };
}

function errorBody(code: number, message = ""): RawApiResponse {
  return { code, token: "", message, data: undefined };
}

function makeStore(): AuthStore {
  return {
    saveCredentials: vi.fn().mockResolvedValue(undefined),
    loadCredentials: vi.fn().mockResolvedValue(undefined),
    clearCredentials: vi.fn().mockResolvedValue(undefined),
    saveSession: vi.fn().mockResolvedValue(undefined),
    loadSession: vi.fn().mockResolvedValue(undefined),
    clearSession: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
  };
}

function makeHttp(responses: Response[]): EdHttpClient {
  let callIdx = 0;
  let gtk: string | undefined;
  let token: string | undefined;
  let twoFaToken: string | undefined;
  let cookies: Record<string, string> = {};

  const nextResponse = () => responses[callIdx++] ?? responses[responses.length - 1];

  return {
    version: "4.96.3",
    get: vi.fn().mockImplementation(() => Promise.resolve(nextResponse())),
    postForm: vi.fn().mockImplementation(() => Promise.resolve(nextResponse())),
    captureAuthHeaders: vi.fn().mockImplementation((res: Response) => {
      const nextGtk = res.headers.get("X-GTK");
      if (nextGtk) gtk = nextGtk;
      const nextToken = res.headers.get("X-Token");
      if (nextToken) token = nextToken;
      const nextTwoFaToken = res.headers.get("2FA-Token");
      if (nextTwoFaToken) twoFaToken = nextTwoFaToken;
    }),
    loadCookies: vi.fn().mockImplementation((nextCookies: Record<string, string>) => {
      cookies = { ...cookies, ...nextCookies };
    }),
    setGtk: vi.fn().mockImplementation((value: string) => {
      gtk = value;
    }),
    getGtk: vi.fn().mockImplementation(() => gtk),
    setToken: vi.fn().mockImplementation((value: string) => {
      token = value;
    }),
    getToken: vi.fn().mockImplementation(() => token),
    clearToken: vi.fn().mockImplementation(() => {
      token = undefined;
    }),
    setTwoFaToken: vi.fn().mockImplementation((value: string) => {
      twoFaToken = value;
    }),
    getTwoFaToken: vi.fn().mockImplementation(() => twoFaToken),
    clearTwoFaToken: vi.fn().mockImplementation(() => {
      twoFaToken = undefined;
    }),
    clearAuth: vi.fn().mockImplementation(() => {
      gtk = undefined;
      token = undefined;
      twoFaToken = undefined;
      cookies = {};
    }),
    getCookies: vi.fn().mockImplementation(() => cookies),
  } as unknown as EdHttpClient;
}

describe("AuthService", () => {
  describe("login", () => {
    it("uses the response X-Token as the authenticated token", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ token: "body-token" }), { "X-Token": "header-token" }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("header-token");
        expect(result.accounts).toEqual([
          { id: 1, type: "1", name: "Jane Doe", establishment: "Lycee" },
        ]);
      }
      expect(store.saveCredentials).toHaveBeenCalledWith({ identifiant: "user", motdepasse: "pass" });
      expect(store.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ token: "header-token", accounts: expect.any(Array) }),
      );
    });

    it("enters the TOTP branch when code 250 has totp=true", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(totpLoginBody(), { "X-Token": "intermediate-token" }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("totp-required");
      if (result.status === "totp-required") {
        expect(result.totp).toBe(true);
      }
    });

    it("enters the secure question branch when code 250 has totp=false", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(doubleAuthLoginBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-1",
        }),
        mockResponse(doubleAuthQuestionBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-2",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("doubleauth-required");
      if (result.status === "doubleauth-required") {
        expect(result.question).toBe("Quelle est l'annee ?");
        expect(result.choices.map((choice) => choice.label)).toEqual(["2011", "2012"]);
      }
    });
  });

  describe("submitTotp", () => {
    it("finishes authentication after a valid TOTP code", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(totpLoginBody(), { "X-Token": "intermediate-token" }),
        mockResponse(successBody(), { "X-Token": "final-token" }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitTotp("123456");

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("final-token");
      }
      expect(store.saveCredentials).toHaveBeenCalledWith({ identifiant: "user", motdepasse: "pass" });
    });

    it("returns an error when no TOTP challenge is pending", async () => {
      const svc = new AuthService(makeHttp([]), makeStore());

      const result = await svc.submitTotp("123456");

      expect(result).toEqual({
        status: "error",
        message: "No pending TOTP challenge",
        recoverable: false,
      });
    });
  });

  describe("submitDoubleAuthChoice", () => {
    it("replays login with the returned cn/cv values and finishes authentication", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(doubleAuthLoginBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-1",
        }),
        mockResponse(doubleAuthQuestionBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-2",
        }),
        mockResponse(doubleAuthAnswerBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-3",
        }),
        mockResponse(successBody({ token: "cas-token" }), {
          "X-Token": "final-token",
          "2FA-Token": "twofa-final",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitDoubleAuthChoice(2);

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("final-token");
      }
      expect(store.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ token: "final-token", twoFaToken: "twofa-final" }),
      );
      expect(http.postForm).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining("/v3/login.awp?v=4.96.3"),
        expect.objectContaining({
          cn: "cn-token",
          cv: "cv-token",
          fa: [{ cn: "cn-token", cv: "cv-token", uniq: false }],
        }),
      );
    });

    it("returns an error for an invalid choice index", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(doubleAuthLoginBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-1",
        }),
        mockResponse(doubleAuthQuestionBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-2",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitDoubleAuthChoice(9);

      expect(result).toEqual({
        status: "error",
        message: "Invalid choice index 9",
        recoverable: true,
      });
    });
  });

  describe("importSession + validateSession", () => {
    const session: StoredSession = {
      token: "imported-token",
      cookies: { GTK: "cookie-gtk" },
      xGtk: "gtk-header",
      twoFaToken: "twofa-imported",
      accounts: [{ id: 1, type: "1", name: "Jane Doe", establishment: "Lycee" }],
      version: "4.96.3",
      savedAt: "2026-01-01T00:00:00.000Z",
    };

    it("promotes a live imported session to authenticated via sondages.awp", async () => {
      const http = makeHttp([
        mockResponse(probeBody("body-probe-token"), {
          "X-Token": "header-probe-token",
          "2FA-Token": "twofa-probe",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.importSession(session);

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("header-probe-token");
        expect(result.accounts).toEqual(session.accounts);
      }
      expect(http.setTwoFaToken).toHaveBeenCalledWith("twofa-imported");
      expect(store.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ token: "header-probe-token", twoFaToken: "twofa-probe" }),
      );
    });

    it("clears a stale imported session and falls back to saved credentials", async () => {
      const http = makeHttp([
        mockResponse(errorBody(ApiCode.EXPIRED_KEY)),
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody(), { "X-Token": "relogin-token" }),
      ]);
      const store = makeStore();
      vi.mocked(store.loadCredentials).mockResolvedValue({ identifiant: "user", motdepasse: "pass" });
      const svc = new AuthService(http, store);

      const result = await svc.importSession(session);

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("relogin-token");
      }
      expect(store.clearSession).toHaveBeenCalled();
    });
  });

  describe("restore", () => {
    it("restores and validates a persisted session", async () => {
      const session: StoredSession = {
        token: "saved-token",
        cookies: { GTK: "cookie-gtk" },
        twoFaToken: "twofa-saved",
        accounts: [{ id: 1, type: "1", name: "Jane Doe" }],
        version: "4.96.3",
        savedAt: "2026-01-01T00:00:00.000Z",
      };
      const http = makeHttp([
        mockResponse(probeBody(), { "X-Token": "validated-token", "2FA-Token": "twofa-validated" }),
      ]);
      const store = makeStore();
      vi.mocked(store.loadSession).mockResolvedValue(session);
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("validated-token");
        expect(result.accounts).toEqual(session.accounts);
      }
    });

    it("stays logged out when nothing is persisted", async () => {
      const svc = new AuthService(makeHttp([]), makeStore());

      const result = await svc.restore();

      expect(result.status).toBe("logged-out");
    });
  });

  describe("validateSession", () => {
    it("returns an error when no active session exists", async () => {
      const svc = new AuthService(makeHttp([]), makeStore());

      const result = await svc.validateSession();

      expect(result).toEqual({
        status: "error",
        message: "No active session to validate",
        recoverable: true,
      });
    });

    it("returns a recoverable error when the probe request fails", async () => {
      const http = makeHttp([]);
      vi.mocked(http.getToken).mockReturnValue("imported-token");
      vi.mocked(http.postForm).mockRejectedValue(new TypeError("fetch failed"));
      const svc = new AuthService(http, makeStore());

      const result = await svc.validateSession();

      expect(result).toEqual({
        status: "error",
        message: "Session validation failed: fetch failed",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
    });
  });

  describe("switchAccount", () => {
    it("renews the live token for a different family account", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: switchableAccounts() }), {
          "X-Token": "login-token",
          "2FA-Token": "twofa-login",
        }),
        mockResponse(renewTokenBody(17405), {
          "X-Token": "renew-token",
          "2FA-Token": "twofa-renew",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.switchAccount(17405);

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("renew-token");
        expect(result.accounts).toEqual([
          expect.objectContaining({ id: 828, current: false, idLogin: 4229759 }),
          expect.objectContaining({ id: 17405, current: true, idLogin: 8955929 }),
        ]);
      }
      expect(http.postForm).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/v3/renewtoken.awp?verbe=post&v=4.96.3"),
        { idUser: 8955929, uuid: "" },
        { includeGtk: false },
      );
      expect(store.saveSession).toHaveBeenLastCalledWith(
        expect.objectContaining({
          token: "renew-token",
          twoFaToken: "twofa-renew",
          accounts: expect.arrayContaining([
            expect.objectContaining({ id: 828, current: false }),
            expect.objectContaining({ id: 17405, current: true }),
          ]),
        }),
      );
    });

    it("returns an actionable error when idLogin metadata is missing", async () => {
      const accounts = [
        {
          id: 828,
          typeCompte: "1",
          nom: "ROUDIER-BOIVIN",
          prenom: "Anne",
          main: true,
          current: true,
        },
        {
          id: 17405,
          typeCompte: "1",
          nom: "ROUDIER-BOIVIN",
          prenom: "Anne",
          current: false,
        },
      ];
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts }), { "X-Token": "login-token" }),
      ]);
      const svc = new AuthService(http, makeStore());

      await svc.login("user", "pass");
      const result = await svc.switchAccount(17405);

      expect(result).toEqual({
        status: "error",
        message: "Account switching requires idLogin metadata for accountId 17405. Re-import a browser session that includes browser account metadata or authenticate again.",
        recoverable: true,
      });
    });
  });

  describe("logout", () => {
    it("clears the current session", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody(), { "X-Token": "final-token" }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.logout();

      expect(result.status).toBe("logged-out");
      expect(store.clearSession).toHaveBeenCalled();
      expect(http.clearAuth).toHaveBeenCalled();
    });
  });

  describe("logoutFull", () => {
    it("clears all persisted auth data", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody(), { "X-Token": "final-token" }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.logoutFull();

      expect(result.status).toBe("logged-out");
      expect(store.clearAll).toHaveBeenCalled();
      expect(http.clearAuth).toHaveBeenCalled();
    });
  });
});
