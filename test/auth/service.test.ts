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

function doubleAuthReplayFa() {
  return [{ cn: "cn-token", cv: "cv-token", uniq: false }];
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
    loadProfileIndex: vi.fn().mockResolvedValue({ profiles: [] }),
    saveProfileIndex: vi.fn().mockResolvedValue(undefined),
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
          { id: 1, type: "1", name: "Jane Doe", establishment: "Lycee", current: true },
        ]);
      }
      expect(store.saveCredentials).toHaveBeenCalledWith({ identifiant: "user", motdepasse: "pass" }, undefined);
      expect(store.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ token: "header-token", accounts: expect.any(Array) }), undefined,
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

    it("returns a recoverable error when bootstrap fetch fails", async () => {
      const http = makeHttp([]);
      vi.mocked(http.get).mockRejectedValue(new TypeError("fetch failed"));
      const svc = new AuthService(http, makeStore());

      const result = await svc.login("user", "pass");

      expect(result).toEqual({
        status: "error",
        message: "Login failed: fetch failed",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
    });

    it("returns a recoverable error when login POST fetch fails", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
      ]);
      vi.mocked(http.postForm).mockRejectedValue(new TypeError("fetch failed"));
      const svc = new AuthService(http, makeStore());

      const result = await svc.login("user", "pass");

      expect(result).toEqual({
        status: "error",
        message: "Login failed: fetch failed",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
    });

    it("includes network cause details when bootstrap fetch fails", async () => {
      const http = makeHttp([]);
      const error = new TypeError("fetch failed") as TypeError & { cause?: unknown };
      error.cause = { code: "EAI_AGAIN", hostname: "api.ecoledirecte.com" };
      vi.mocked(http.get).mockRejectedValue(error);
      const svc = new AuthService(http, makeStore());

      const result = await svc.login("user", "pass");

      expect(result).toEqual({
        status: "error",
        message: "Login failed: fetch failed (EAI_AGAIN, api.ecoledirecte.com)",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
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
      expect(http.postForm).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/v3/login.awp?v=4.96.3"),
        expect.objectContaining({
          fa: [{ cv: "123456", cn: "" }],
        }),
        { includeToken: false, includeTwoFaToken: false },
      );
      expect(store.saveCredentials).toHaveBeenCalledWith({ identifiant: "user", motdepasse: "pass" }, undefined);
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

    it("returns a recoverable error when TOTP replay fetch fails", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(totpLoginBody(), { "X-Token": "intermediate-token" }),
      ]);
      const svc = new AuthService(http, makeStore());
      await svc.login("user", "pass");

      vi.mocked(http.postForm).mockRejectedValue(new TypeError("fetch failed"));
      const result = await svc.submitTotp("123456");

      expect(result).toEqual({
        status: "error",
        message: "TOTP submission failed: fetch failed",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
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
        expect.objectContaining({ token: "final-token", twoFaToken: "twofa-final" }), undefined,
      );
      expect(store.saveCredentials).toHaveBeenCalledWith({
        identifiant: "user",
        motdepasse: "pass",
        fa: doubleAuthReplayFa(),
      }, undefined);
      expect(http.postForm).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining("/v3/login.awp?v=4.96.3"),
        expect.objectContaining({
          fa: doubleAuthReplayFa(),
        }),
        { includeToken: false, includeTwoFaToken: false },
      );

      const finalLoginPayload = vi.mocked(http.postForm).mock.calls[3]?.[1] as Record<string, unknown>;
      expect(finalLoginPayload).not.toHaveProperty("cn");
      expect(finalLoginPayload).not.toHaveProperty("cv");
      expect(http.postForm).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("/v3/connexion/doubleauth.awp?verbe=post&v=4.96.3"),
        { choix: Buffer.from("2012").toString("base64") },
        { includeGtk: false },
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

    it("returns an error when the final login returns invalid credentials (505)", async () => {
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
        mockResponse(errorBody(ApiCode.INVALID_CREDENTIALS, "Vos identifiants sont incorrects"), {
          "X-Token": "error-token",
          "2FA-Token": "twofa-error",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitDoubleAuthChoice(2);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("Vos identifiants sont incorrects");
        expect(result.recoverable).toBe(true);
      }
    });

    it("returns an error when the challenge answer is missing cn/cv", async () => {
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
        // Answer response with OK code but missing cn/cv
        mockResponse({ code: ApiCode.OK, token: "", message: "", data: {} }, {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-3",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitDoubleAuthChoice(2);

      expect(result).toEqual({
        status: "error",
        message: "Identity verification failed",
        recoverable: true,
      });
    });

    it("returns an error when the challenge answer POST fails", async () => {
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
        mockResponse(errorBody(ApiCode.INVALID_CREDENTIALS, "Verification refused"), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-3",
        }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitDoubleAuthChoice(2);

      expect(result).toEqual({
        status: "error",
        message: "Verification refused",
        recoverable: true,
      });
    });

    it("preserves the login GTK when doubleauth responses include a different X-GTK", async () => {
      const http = makeHttp([
        // Bootstrap — sets initial GTK
        mockResponse({ code: 200, token: "", message: "" }, { "X-GTK": "bootstrap-gtk" }),
        // Initial login — preserves GTK
        mockResponse(doubleAuthLoginBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-1",
        }),
        // Challenge GET — returns a DIFFERENT X-GTK that should not corrupt final login
        mockResponse(doubleAuthQuestionBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-2",
          "X-GTK": "rotated-gtk-from-challenge",
        }),
        // Challenge POST answer
        mockResponse(doubleAuthAnswerBody(), {
          "X-Token": "intermediate-token",
          "2FA-Token": "twofa-step-3",
        }),
        // Final login replay
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
      // Verify the GTK was restored before the final login
      expect(http.setGtk).toHaveBeenLastCalledWith("bootstrap-gtk");
    });

    it("returns a recoverable error when challenge fetch fails", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(doubleAuthLoginBody(), { "X-Token": "intermediate-token" }),
        mockResponse(doubleAuthQuestionBody()),
      ]);
      const svc = new AuthService(http, makeStore());
      await svc.login("user", "pass");

      vi.mocked(http.postForm).mockRejectedValue(new TypeError("fetch failed"));
      const result = await svc.submitDoubleAuthChoice(1);

      expect(result).toEqual({
        status: "error",
        message: "Identity verification failed: fetch failed",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
    });
  });

  describe("importSession + validateSession", () => {
    const session: StoredSession = {
      token: "imported-token",
      cookies: { GTK: "cookie-gtk" },
      xGtk: "gtk-header",
      twoFaToken: "twofa-imported",
      accounts: [{ id: 1, type: "1", name: "Jane Doe", establishment: "Lycee", current: true }],
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
        expect.objectContaining({ token: "header-probe-token", twoFaToken: "twofa-probe" }), undefined,
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

  describe("loginFromStore", () => {
    it("logs in using credentials loaded from the store", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody(), { "X-Token": "header-token" }),
      ]);
      const store = makeStore();
      vi.mocked(store.loadCredentials).mockResolvedValue({ identifiant: "user", motdepasse: "pass" });
      const svc = new AuthService(http, store);

      const result = await svc.loginFromStore();

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("header-token");
      }
      expect(store.loadCredentials).toHaveBeenCalled();
    });

    it("reuses persisted fa from credentials and retries cleanly when it is stale", async () => {
      const staleFa = [{ cn: "stale-cn", cv: "stale-cv", uniq: false }];
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(errorBody(ApiCode.INVALID_CREDENTIALS, "Votre mot de passe de confirmation est incorrect !")),
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody(), { "X-Token": "header-token" }),
      ]);
      const store = makeStore();
      vi.mocked(store.loadCredentials).mockResolvedValue({ identifiant: "user", motdepasse: "pass", fa: staleFa });
      const svc = new AuthService(http, store);

      const result = await svc.loginFromStore();

      expect(result.status).toBe("authenticated");
      expect(http.postForm).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/v3/login.awp?v=4.96.3"),
        expect.objectContaining({ fa: staleFa }),
      );
      expect(http.postForm).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/v3/login.awp?v=4.96.3"),
        expect.objectContaining({ fa: [] }),
      );
      expect(store.saveCredentials).toHaveBeenCalledWith({ identifiant: "user", motdepasse: "pass" }, undefined);
    });

    it("returns an actionable error when no credentials file exists", async () => {
      const svc = new AuthService(makeHttp([]), makeStore());

      const result = await svc.loginFromStore();

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("No credentials file found");
        expect(result.message).toContain("ECOLEDIRECTE_CREDENTIALS_FILE");
        expect(result.recoverable).toBe(true);
      }
    });
  });

  describe("restore", () => {
    it("restores and validates a persisted session", async () => {
      const session: StoredSession = {
        token: "saved-token",
        cookies: { GTK: "cookie-gtk" },
        twoFaToken: "twofa-saved",
        accounts: [{ id: 1, type: "1", name: "Jane Doe", current: true }],
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

    it("auto-logs in from saved credentials when session is absent", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody(), { "X-Token": "relogin-token" }),
      ]);
      const store = makeStore();
      vi.mocked(store.loadSession).mockResolvedValue(undefined);
      vi.mocked(store.loadCredentials).mockResolvedValue({ identifiant: "user", motdepasse: "pass" });
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("relogin-token");
      }
    });

    it("returns a recoverable error when restore fails due to a network error", async () => {
      const http = makeHttp([]);
      const store = makeStore();
      vi.mocked(store.loadSession).mockRejectedValue(new TypeError("fetch failed"));
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result).toEqual({
        status: "error",
        message: "Session restore failed: fetch failed",
        recoverable: true,
      });
      expect(svc.getState()).toEqual(result);
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
        }), undefined,
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

  describe("login dedup", () => {
    it("deduplicates concurrent login calls", async () => {
      let resolveFetch!: (res: Response) => void;
      const bootstrapPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      const http = makeHttp([
        mockResponse(successBody(), { "X-Token": "header-token" }),
      ]);
      vi.mocked(http.get).mockReturnValueOnce(bootstrapPromise);

      const svc = new AuthService(http, makeStore());

      // Start two logins concurrently
      const p1 = svc.login("user", "pass");
      const p2 = svc.login("user", "pass");

      // Resolve the bootstrap fetch
      resolveFetch(mockResponse({ code: 200, token: "", message: "" }));

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.status).toBe("authenticated");
      expect(r2.status).toBe("authenticated");

      // Only one bootstrap GET was made (proving dedup)
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it("allows a new login after the previous one completes", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ token: "t1" }), { "X-Token": "token-1" }),
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ token: "t2" }), { "X-Token": "token-2" }),
      ]);
      const svc = new AuthService(http, makeStore());

      const r1 = await svc.login("user", "pass");
      expect(r1.status).toBe("authenticated");

      const r2 = await svc.login("user", "pass");
      expect(r2.status).toBe("authenticated");

      expect(http.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("error formatting", () => {
    it("includes error.cause in login error messages", async () => {
      const http = makeHttp([]);
      const fetchError = new TypeError("fetch failed");
      (fetchError as TypeError & { cause: Error }).cause = new Error("connect ECONNREFUSED 127.0.0.1:443");
      vi.mocked(http.get).mockRejectedValue(fetchError);
      const svc = new AuthService(http, makeStore());

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toBe("Login failed: fetch failed (connect ECONNREFUSED 127.0.0.1:443)");
      }
    });

    it("formats TimeoutError as a readable timeout message", async () => {
      const http = makeHttp([]);
      const timeoutError = new DOMException("The operation was aborted", "TimeoutError");
      vi.mocked(http.get).mockRejectedValue(timeoutError);
      const svc = new AuthService(http, makeStore());

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("timed out");
      }
    });

    it("formats a wrapped TimeoutError cause as a timeout message", async () => {
      const http = makeHttp([]);
      const timeoutCause = new DOMException("The operation timed out", "TimeoutError");
      const fetchError = new TypeError("fetch failed");
      (fetchError as TypeError & { cause: Error }).cause = timeoutCause;
      vi.mocked(http.get).mockRejectedValue(fetchError);
      const svc = new AuthService(http, makeStore());

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("timed out");
      }
    });
  });

  describe("loginFromStore error handling", () => {
    it("catches store.loadCredentials errors and returns error state", async () => {
      const http = makeHttp([]);
      const store = makeStore();
      vi.mocked(store.loadCredentials).mockRejectedValue(new Error("EACCES permission denied"));
      const svc = new AuthService(http, store);

      const result = await svc.loginFromStore();

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("EACCES permission denied");
        expect(result.recoverable).toBe(true);
      }
    });
  });

  describe("switchRole", () => {
    function teacherAccount(): unknown[] {
      return [
        {
          id: 221,
          idLogin: 99001,
          typeCompte: "P",
          nom: "DUPONT",
          prenom: "Marie",
          nomEtablissement: "Collège Victor Hugo",
          uid: "abc-uid-teacher",
          isProfEtPersonnel: true,
          main: true,
          current: true,
          modules: [{ code: "MESSAGERIE", enable: true }, { code: "NOTES", enable: true }],
          profile: {
            classes: [{ id: 18, code: "3B", libelle: "3ème B" }],
          },
        },
      ];
    }

    function switchRoleResponseBody(targetType: string): RawApiResponse {
      return {
        code: ApiCode.OK,
        token: "role-switch-token",
        message: "",
        data: {
          id: 221,
          accounts: [
            {
              id: 221,
              idLogin: 99001,
              typeCompte: targetType,
              nom: "DUPONT",
              prenom: "Marie",
              nomEtablissement: "Collège Victor Hugo",
              uid: "abc-uid-personnel",
              isProfEtPersonnel: true,
              main: true,
              modules: [{ code: "MESSAGERIE", enable: true }, { code: "NOTES", enable: true }],
              profile: {
                classes: [
                  { id: 18, code: "3B", libelle: "3ème B" },
                  { id: 22, code: "4A", libelle: "4ème A" },
                ],
              },
            },
          ],
        },
      };
    }

    it("switches from teacher to personnel role via apip renewtoken", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: teacherAccount() }), { "X-Token": "login-token" }),
        mockResponse(switchRoleResponseBody("A"), { "X-Token": "role-switch-token" }),
      ]);
      const store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.switchRole("personnel");

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("role-switch-token");
        expect(result.accounts).toEqual([
          expect.objectContaining({
            id: 221,
            type: "A",
            isProfEtPersonnel: true,
            uid: "abc-uid-personnel",
            current: true,
          }),
        ]);
        // Should now show 2 classes (personnel sees all)
        expect(result.accounts[0].classes).toHaveLength(2);
      }
      expect(http.postForm).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("apip.ecoledirecte.com/v3/renewtoken.awp?verbe=put"),
        { profil: "A", uid: "abc-uid-teacher", uuid: "" },
        { includeGtk: false },
      );
      expect(store.saveSession).toHaveBeenLastCalledWith(
        expect.objectContaining({
          token: "role-switch-token",
          accounts: expect.arrayContaining([
            expect.objectContaining({ id: 221, type: "A", current: true }),
          ]),
        }), undefined,
      );
    });

    it("returns current state when already in the requested role", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: teacherAccount() }), { "X-Token": "login-token" }),
      ]);
      const svc = new AuthService(http, makeStore());

      await svc.login("user", "pass");
      const result = await svc.switchRole("teacher");

      expect(result.status).toBe("authenticated");
      // No additional API call should have been made
      expect(http.postForm).toHaveBeenCalledTimes(1);
    });

    it("returns error when account does not support dual roles", async () => {
      const singleRoleAccount = [{
        id: 221,
        idLogin: 99001,
        typeCompte: "P",
        nom: "DUPONT",
        prenom: "Marie",
        main: true,
        current: true,
      }];
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: singleRoleAccount }), { "X-Token": "login-token" }),
      ]);
      const svc = new AuthService(http, makeStore());

      await svc.login("user", "pass");
      const result = await svc.switchRole("personnel");

      expect(result).toEqual({
        status: "error",
        message: "This account does not support role switching. Only accounts with both teacher and personnel roles can switch.",
        recoverable: true,
      });
    });

    it("returns error when uid is missing", async () => {
      const noUidAccount = [{
        id: 221,
        idLogin: 99001,
        typeCompte: "P",
        nom: "DUPONT",
        prenom: "Marie",
        isProfEtPersonnel: true,
        main: true,
        current: true,
      }];
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: noUidAccount }), { "X-Token": "login-token" }),
      ]);
      const svc = new AuthService(http, makeStore());

      await svc.login("user", "pass");
      const result = await svc.switchRole("personnel");

      expect(result).toEqual({
        status: "error",
        message: "Role switching requires uid metadata. Re-import a browser session that includes uid or authenticate again.",
        recoverable: true,
      });
    });

    it("returns error when API reports failure", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: teacherAccount() }), { "X-Token": "login-token" }),
        mockResponse(errorBody(520, "Session expired")),
      ]);
      const svc = new AuthService(http, makeStore());

      await svc.login("user", "pass");
      const result = await svc.switchRole("personnel");

      expect(result).toEqual({
        status: "error",
        message: "Session expired",
        recoverable: true,
      });
    });

    it("returns error when fetch fails", async () => {
      const http = makeHttp([
        mockResponse({ code: 200, token: "", message: "" }),
        mockResponse(successBody({ accounts: teacherAccount() }), { "X-Token": "login-token" }),
      ]);
      vi.mocked(http.postForm).mockRejectedValueOnce(new TypeError("fetch failed"));
      // Override: first call succeeds (login), second fails (switchRole)
      const loginResponse = mockResponse(successBody({ accounts: teacherAccount() }), { "X-Token": "login-token" });
      vi.mocked(http.postForm)
        .mockReset()
        .mockResolvedValueOnce(loginResponse)
        .mockRejectedValueOnce(new TypeError("fetch failed"));
      const svc = new AuthService(http, makeStore());

      await svc.login("user", "pass");
      const result = await svc.switchRole("personnel");

      expect(result).toEqual({
        status: "error",
        message: "Role switch failed: fetch failed",
        recoverable: true,
      });
    });
  });
});
