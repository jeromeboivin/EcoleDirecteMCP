/**
 * Auth orchestration service for EcoleDirecte.
 *
 * Manages the login state machine:
 *   logged-out → (bootstrap + login POST) → authenticated | totp-required | error
 *   totp-required → (submit TOTP) → authenticated | error
 *   session-imported → (validate) → authenticated | error
 *
 * Also handles credential persistence, session save/restore, and logout.
 */

import { EdHttpClient } from "../http/client.js";
import { loginUrl } from "../api/constants.js";
import { normalizeLoginResponse, type RawApiResponse } from "../api/normalize.js";
import type { AuthStore } from "./store.js";
import type {
  AuthState,
  LoginPayload,
  StoredCredentials,
  StoredSession,
  AccountInfo,
} from "./types.js";
import { redact } from "../logging.js";

export class AuthService {
  private state: AuthState = { status: "logged-out" };
  private pendingPayload: LoginPayload | undefined;

  constructor(
    private readonly http: EdHttpClient,
    private readonly store: AuthStore,
  ) {}

  getState(): AuthState {
    return this.state;
  }

  // ── Direct login ─────────────────────────────────────────────

  async login(identifiant: string, motdepasse: string): Promise<AuthState> {
    this.state = { status: "login-pending" };

    // 1. Bootstrap — obtain GTK cookie + header value
    const bootstrapUrl = loginUrl({ gtk: true, version: this.http.version });
    const bootstrapRes = await this.http.get(bootstrapUrl);
    this.http.captureAuthHeaders(bootstrapRes);

    // The bootstrap body may contain a GTK value we need for the POST
    try {
      const bootstrapBody = (await bootstrapRes.json()) as RawApiResponse;
      if (bootstrapBody.token) {
        this.http.setGtk(bootstrapBody.token);
      }
    } catch {
      // Non-JSON bootstrap response — GTK is in headers/cookies only
    }

    // 2. Login POST
    const payload: LoginPayload = {
      identifiant,
      motdepasse,
      isReLogin: false,
      uuid: "",
      fa: [],
    };
    this.pendingPayload = payload;

    const postUrl = loginUrl({ version: this.http.version });
    const res = await this.http.postForm(postUrl, payload as unknown as Record<string, unknown>);
    this.http.captureAuthHeaders(res);

    const body = (await res.json()) as RawApiResponse;
    const result = normalizeLoginResponse(body);

    switch (result.nextState) {
      case "authenticated": {
        const accounts = extractAccounts(body);
        this.state = {
          status: "authenticated",
          token: result.token!,
          accounts,
        };
        await this.persistSession(result.token!);
        await this.store.saveCredentials({ identifiant, motdepasse });
        break;
      }

      case "totp-required": {
        const totp = !!(result.challenge?.totp ?? true);
        this.state = {
          status: "totp-required",
          challenge: result.challenge ?? {},
          totp,
        };
        break;
      }

      default:
        this.state = {
          status: "error",
          message: result.message ?? "Login failed",
          recoverable: result.nextState === "error",
        };
    }

    return this.state;
  }

  // ── TOTP continuation ────────────────────────────────────────

  async submitTotp(code: string): Promise<AuthState> {
    if (this.state.status !== "totp-required" || !this.pendingPayload) {
      return {
        status: "error",
        message: "No pending TOTP challenge",
        recoverable: false,
      };
    }

    const payload: LoginPayload = {
      ...this.pendingPayload,
      fa: [{ cv: code, cn: "" }],
    };

    const postUrl = loginUrl({ version: this.http.version });
    const res = await this.http.postForm(postUrl, payload as unknown as Record<string, unknown>);
    this.http.captureAuthHeaders(res);

    const body = (await res.json()) as RawApiResponse;
    const result = normalizeLoginResponse(body);

    if (result.nextState === "authenticated") {
      const accounts = extractAccounts(body);
      this.state = {
        status: "authenticated",
        token: result.token!,
        accounts,
      };
      await this.persistSession(result.token!);
      if (this.pendingPayload) {
        await this.store.saveCredentials({
          identifiant: this.pendingPayload.identifiant,
          motdepasse: this.pendingPayload.motdepasse,
        });
      }
      this.pendingPayload = undefined;
    } else {
      this.state = {
        status: "error",
        message: result.message ?? "TOTP verification failed",
        recoverable: true,
      };
    }

    return this.state;
  }

  // ── Session import ───────────────────────────────────────────

  async importSession(session: StoredSession): Promise<AuthState> {
    this.http.loadCookies(session.cookies);
    if (session.xGtk) this.http.setGtk(session.xGtk);

    this.state = {
      status: "session-imported",
      token: session.token,
    };
    await this.store.saveSession(session);
    return this.state;
  }

  // ── Session restore on startup ───────────────────────────────

  async restore(): Promise<AuthState> {
    const session = await this.store.loadSession();
    if (session) {
      this.http.loadCookies(session.cookies);
      if (session.xGtk) this.http.setGtk(session.xGtk);
      this.state = { status: "session-imported", token: session.token };
      return this.state;
    }

    const creds = await this.store.loadCredentials();
    if (creds) {
      return this.login(creds.identifiant, creds.motdepasse);
    }

    return this.state; // still logged-out
  }

  // ── Logout ───────────────────────────────────────────────────

  async logout(): Promise<AuthState> {
    this.state = { status: "logged-out" };
    this.pendingPayload = undefined;
    await this.store.clearSession();
    return this.state;
  }

  async logoutFull(): Promise<AuthState> {
    this.state = { status: "logged-out" };
    this.pendingPayload = undefined;
    await this.store.clearAll();
    return this.state;
  }

  // ── Internal helpers ─────────────────────────────────────────

  private async persistSession(token: string): Promise<void> {
    const session: StoredSession = {
      token,
      cookies: this.http.getCookies(),
      xGtk: this.http.getGtk(),
      version: this.http.version,
      savedAt: new Date().toISOString(),
    };
    await this.store.saveSession(session);
  }
}

/** Best-effort extraction of account info from a successful login response. */
function extractAccounts(body: RawApiResponse): AccountInfo[] {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return [];
  const accounts = data.accounts as
    | Array<{ id: number; typeCompte: string; nom: string; prenom: string; nomEtablissement?: string }>
    | undefined;
  if (!Array.isArray(accounts)) return [];
  return accounts.map((a) => ({
    id: a.id,
    type: a.typeCompte,
    name: `${a.prenom} ${a.nom}`.trim(),
    establishment: a.nomEtablissement,
  }));
}
