import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../../src/ecoledirecte/auth/service.js";
import type { EdHttpClient } from "../../src/ecoledirecte/http/client.js";
import type { AuthStore } from "../../src/ecoledirecte/auth/store.js";
import type { StoredSession } from "../../src/ecoledirecte/auth/types.js";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";

// ── Mock factories ────────────────────────────────────────────

function mockResponse(body: RawApiResponse, headers?: Record<string, string>): Response {
  const h = new Headers(headers);
  // getSetCookie may not exist on all platforms; stub it.
  if (!(h as any).getSetCookie) {
    (h as any).getSetCookie = () => [];
  }
  return {
    json: () => Promise.resolve(body),
    headers: h,
  } as unknown as Response;
}

function successBody(opts?: { accounts?: unknown[]; token?: string }): RawApiResponse {
  return {
    code: ApiCode.OK,
    token: opts?.token ?? "tok-ok",
    message: "",
    data: { accounts: opts?.accounts ?? [{ id: 1, typeCompte: "E", nom: "Doe", prenom: "Jane", nomEtablissement: "Lycée" }] },
  };
}

function totpBody(): RawApiResponse {
  return {
    code: ApiCode.AUTH_2FA,
    token: "",
    message: "",
    data: { totp: true },
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
  const nextResponse = () => responses[callIdx++] ?? responses[responses.length - 1];
  return {
    version: "4.96.3",
    get: vi.fn().mockImplementation(() => Promise.resolve(nextResponse())),
    postForm: vi.fn().mockImplementation(() => Promise.resolve(nextResponse())),
    captureAuthHeaders: vi.fn(),
    loadCookies: vi.fn(),
    setGtk: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn().mockReturnValue(undefined),
    clearToken: vi.fn(),
    clearAuth: vi.fn(),
    getCookies: vi.fn().mockReturnValue({}),
    getGtk: vi.fn().mockReturnValue(undefined),
  } as unknown as EdHttpClient;
}

// ── Tests ─────────────────────────────────────────────────────

describe("AuthService", () => {
  let store: AuthStore;

  describe("login", () => {
    it("reaches authenticated state on code 200", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "gtk-val", message: "" });
      const loginRes = mockResponse(successBody());
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("tok-ok");
        expect(result.accounts).toHaveLength(1);
        expect(result.accounts[0].name).toBe("Jane Doe");
      }
      expect(store.saveCredentials).toHaveBeenCalledWith({ identifiant: "user", motdepasse: "pass" });
      expect(store.saveSession).toHaveBeenCalled();
      expect(http.setToken).toHaveBeenCalledWith("tok-ok");
    });

    it("reaches totp-required on code 250", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "gtk-val", message: "" });
      const loginRes = mockResponse(totpBody());
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("totp-required");
      if (result.status === "totp-required") {
        expect(result.totp).toBe(true);
      }
    });

    it("reaches error on invalid credentials (505)", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const loginRes = mockResponse(errorBody(ApiCode.INVALID_CREDENTIALS, "Mauvais identifiants"));
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "wrong");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toBe("Mauvais identifiants");
      }
    });

    it("reaches error on blocked account (516)", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const loginRes = mockResponse(errorBody(ApiCode.BLOCKED));
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.login("user", "pass");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("blocked");
      }
    });
  });

  describe("submitTotp", () => {
    it("reaches authenticated after valid TOTP code", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "gtk-val", message: "" });
      const totpRes = mockResponse(totpBody());
      const authRes = mockResponse(successBody());
      const http = makeHttp([bootstrapRes, totpRes, authRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitTotp("123456");

      expect(result.status).toBe("authenticated");
      expect(store.saveCredentials).toHaveBeenCalled();
      expect(store.saveSession).toHaveBeenCalled();
      expect(http.setToken).toHaveBeenCalledWith("tok-ok");
    });

    it("returns error when no TOTP challenge is pending", async () => {
      const http = makeHttp([]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.submitTotp("123456");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("No pending TOTP");
        expect(result.recoverable).toBe(false);
      }
    });

    it("returns error on invalid TOTP code", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const totpRes = mockResponse(totpBody());
      const failRes = mockResponse(errorBody(ApiCode.INVALID_CREDENTIALS, "Code incorrect"));
      const http = makeHttp([bootstrapRes, totpRes, failRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      await svc.login("user", "pass");
      const result = await svc.submitTotp("000000");

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.recoverable).toBe(true);
      }
    });
  });

  describe("importSession + validateSession", () => {
    const session: StoredSession = {
      token: "tok-imported",
      cookies: { GTK: "abc" },
      xGtk: "gtk-val",
      version: "4.96.3",
      savedAt: "2026-01-01T00:00:00Z",
    };

    it("validates and promotes to authenticated when probe succeeds", async () => {
      const probeRes = mockResponse(successBody({ token: "tok-rotated" }));
      const http = makeHttp([probeRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.importSession(session);

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("tok-rotated");
        expect(result.accounts).toHaveLength(1);
      }
      expect(http.loadCookies).toHaveBeenCalledWith(session.cookies);
      expect(http.setGtk).toHaveBeenCalledWith("gtk-val");
      expect(http.setToken).toHaveBeenCalledWith("tok-imported");
    });

    it("clears stale session and returns error when probe fails and no creds saved", async () => {
      const expiredRes = mockResponse(errorBody(ApiCode.EXPIRED_KEY));
      const http = makeHttp([expiredRes]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.importSession(session);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("expired");
        expect(result.recoverable).toBe(true);
      }
      expect(store.clearSession).toHaveBeenCalled();
    });

    it("falls back to saved credentials when probe fails", async () => {
      const expiredRes = mockResponse(errorBody(ApiCode.EXPIRED_KEY));
      // Re-login will need bootstrap + login responses
      const bootstrapRes = mockResponse({ code: 200, token: "gtk-new", message: "" });
      const loginRes = mockResponse(successBody({ token: "tok-relogin" }));
      const http = makeHttp([expiredRes, bootstrapRes, loginRes]);
      store = makeStore();
      (store.loadCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        identifiant: "user",
        motdepasse: "pass",
      });
      const svc = new AuthService(http, store);

      const result = await svc.importSession(session);

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("tok-relogin");
      }
    });
  });

  describe("validateSession", () => {
    it("returns error when no active session exists", async () => {
      const http = makeHttp([]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.validateSession();

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("No active session");
      }
    });
  });

  describe("restore", () => {
    it("validates a restored session from the store", async () => {
      const session: StoredSession = {
        token: "tok-saved",
        cookies: { A: "1" },
        version: "4.96.3",
        savedAt: "2026-01-01T00:00:00Z",
      };
      const probeRes = mockResponse(successBody({ token: "tok-fresh" }));
      const http = makeHttp([probeRes]);
      store = makeStore();
      (store.loadSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result.status).toBe("authenticated");
      if (result.status === "authenticated") {
        expect(result.token).toBe("tok-fresh");
      }
    });

    it("falls back to credentials when session is stale", async () => {
      const staleSession: StoredSession = {
        token: "tok-old",
        cookies: {},
        version: "4.96.3",
        savedAt: "2025-01-01T00:00:00Z",
      };
      const probeRes = mockResponse(errorBody(ApiCode.EXPIRED_KEY));
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const loginRes = mockResponse(successBody({ token: "tok-new" }));
      const http = makeHttp([probeRes, bootstrapRes, loginRes]);
      store = makeStore();
      (store.loadSession as ReturnType<typeof vi.fn>).mockResolvedValue(staleSession);
      (store.loadCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        identifiant: "user",
        motdepasse: "pass",
      });
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result.status).toBe("authenticated");
      expect(store.clearSession).toHaveBeenCalled();
    });

    it("falls back to credentials when no session exists", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const loginRes = mockResponse(successBody());
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      (store.loadCredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
        identifiant: "user",
        motdepasse: "pass",
      });
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result.status).toBe("authenticated");
    });

    it("stays logged-out when nothing is persisted", async () => {
      const http = makeHttp([]);
      store = makeStore();
      const svc = new AuthService(http, store);

      const result = await svc.restore();

      expect(result.status).toBe("logged-out");
    });
  });

  describe("logout", () => {
    it("clears session and resets state", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const loginRes = mockResponse(successBody());
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      const svc = new AuthService(http, store);
      await svc.login("user", "pass");

      const result = await svc.logout();

      expect(result.status).toBe("logged-out");
      expect(store.clearSession).toHaveBeenCalled();
      expect(http.clearAuth).toHaveBeenCalled();
    });
  });

  describe("logoutFull", () => {
    it("clears all persisted auth material", async () => {
      const bootstrapRes = mockResponse({ code: 200, token: "", message: "" });
      const loginRes = mockResponse(successBody());
      const http = makeHttp([bootstrapRes, loginRes]);
      store = makeStore();
      const svc = new AuthService(http, store);
      await svc.login("user", "pass");

      const result = await svc.logoutFull();

      expect(result.status).toBe("logged-out");
      expect(store.clearAll).toHaveBeenCalled();
      expect(http.clearAuth).toHaveBeenCalled();
    });
  });
});
