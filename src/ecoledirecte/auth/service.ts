/**
 * Auth orchestration service for EcoleDirecte.
 *
 * Manages the login state machine:
 *   logged-out → (bootstrap + login POST) → authenticated | totp-required | doubleauth-required | error
 *   totp-required → (submit TOTP) → authenticated | error
 *   doubleauth-required → (submit challenge answer + final login POST) → authenticated | error
 *   session-imported → (validate) → authenticated | error
 *
 * Also handles credential persistence, session save/restore, and logout.
 */

import { EdHttpClient } from "../http/client.js";
import { doubleAuthUrl, loginUrl, probeUrl } from "../api/constants.js";
import { ApiCode, normalizeLoginResponse, normalizeProbeResponse, type RawApiResponse } from "../api/normalize.js";
import type { AuthStore } from "./store.js";
import type {
  AuthState,
  LoginPayload,
  StoredSession,
  AccountInfo,
} from "./types.js";

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
    this.http.clearAuth();
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
        return this.completeAuthentication(body, { identifiant, motdepasse });
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

      case "doubleauth-required":
        return this.fetchDoubleAuthChallenge();

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
      return this.completeAuthentication(body, {
        identifiant: this.pendingPayload.identifiant,
        motdepasse: this.pendingPayload.motdepasse,
      });
    }

    this.state = {
      status: "error",
      message: result.message ?? "TOTP verification failed",
      recoverable: true,
    };

    return this.state;
  }

  // ── Secure question continuation ───────────────────────────

  async submitDoubleAuthChoice(choiceIndex: number): Promise<AuthState> {
    if (this.state.status !== "doubleauth-required" || !this.pendingPayload) {
      return {
        status: "error",
        message: "No pending identity verification challenge",
        recoverable: false,
      };
    }

    const choice = this.state.choices[choiceIndex - 1];
    if (!choice) {
      return {
        status: "error",
        message: `Invalid choice index ${choiceIndex}`,
        recoverable: true,
      };
    }

    const challengeRes = await this.http.postForm(
      doubleAuthUrl({ verb: "post", version: this.http.version }),
      { choix: choice.value },
      { includeGtk: false },
    );
    this.http.captureAuthHeaders(challengeRes);

    const challengeBody = (await challengeRes.json()) as RawApiResponse;
    const challengeData = challengeBody.data as Record<string, unknown> | undefined;
    const cn = typeof challengeData?.cn === "string" ? challengeData.cn : undefined;
    const cv = typeof challengeData?.cv === "string" ? challengeData.cv : undefined;

    if (challengeBody.code !== ApiCode.OK || !cn || !cv) {
      this.state = {
        status: "error",
        message: challengeBody.message || "Identity verification failed",
        recoverable: true,
      };
      return this.state;
    }

    const payload: LoginPayload = {
      ...this.pendingPayload,
      cn,
      cv,
      fa: [{ cn, cv, uniq: false }],
    };

    const loginRes = await this.http.postForm(
      loginUrl({ version: this.http.version }),
      payload as unknown as Record<string, unknown>,
    );
    this.http.captureAuthHeaders(loginRes);

    const loginBody = (await loginRes.json()) as RawApiResponse;
    const result = normalizeLoginResponse(loginBody);

    if (result.nextState === "authenticated") {
      return this.completeAuthentication(loginBody, {
        identifiant: this.pendingPayload.identifiant,
        motdepasse: this.pendingPayload.motdepasse,
      });
    }

    this.state = {
      status: "error",
      message: result.message ?? "Identity verification failed",
      recoverable: true,
    };
    return this.state;
  }

  // ── Session import ───────────────────────────────────────────

  async importSession(session: StoredSession): Promise<AuthState> {
    this.http.loadCookies(session.cookies);
    if (session.xGtk) this.http.setGtk(session.xGtk);
    if (session.twoFaToken) this.http.setTwoFaToken(session.twoFaToken);
    this.http.setToken(session.token);

    this.state = {
      status: "session-imported",
      token: session.token,
      accounts: session.accounts,
    };
    await this.store.saveSession(session);

    // Validate the imported session against the live API
    return this.validateSession();
  }

  // ── Session validation (probe) ───────────────────────────────

  async validateSession(): Promise<AuthState> {
    const token = this.getActiveToken();
    if (!token) {
      this.state = {
        status: "error",
        message: "No active session to validate",
        recoverable: true,
      };
      return this.state;
    }

    try {
      this.http.setToken(token);
      const url = probeUrl({ version: this.http.version });
      const res = await this.http.postForm(url, {}, { includeGtk: false });
      this.http.captureAuthHeaders(res);

      const body = (await res.json()) as RawApiResponse;
      const probe = normalizeProbeResponse(body);

      if (probe.valid) {
        const resolvedToken = this.getResolvedToken(probe.token ?? token);
        if (this.state.status === "authenticated") {
          this.state = { ...this.state, token: resolvedToken };
          await this.persistSession(resolvedToken, this.state.accounts);
          return this.state;
        }
        const accounts = this.state.status === "session-imported" ? this.state.accounts ?? [] : [];
        this.state = {
          status: "authenticated",
          token: resolvedToken,
          accounts,
        };
        await this.persistSession(resolvedToken, accounts);
        return this.state;
      }

      await this.store.clearSession();
      this.http.clearAuth();

      // Try saved credentials as fallback
      const creds = await this.store.loadCredentials();
      if (creds) {
        return this.login(creds.identifiant, creds.motdepasse);
      }

      this.state = {
        status: "error",
        message: probe.reason ?? "Session invalid",
        recoverable: true,
      };
      return this.state;
    } catch (error) {
      this.state = {
        status: "error",
        message: `Session validation failed: ${error instanceof Error ? error.message : String(error)}`,
        recoverable: true,
      };
      return this.state;
    }
  }

  // ── Session restore on startup ───────────────────────────────

  async restore(): Promise<AuthState> {
    const session = await this.store.loadSession();
    if (session) {
      this.http.loadCookies(session.cookies);
      if (session.xGtk) this.http.setGtk(session.xGtk);
      if (session.twoFaToken) this.http.setTwoFaToken(session.twoFaToken);
      this.http.setToken(session.token);
      this.state = {
        status: "session-imported",
        token: session.token,
        accounts: session.accounts,
      };
      return this.validateSession();
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
    this.http.clearAuth();
    await this.store.clearSession();
    return this.state;
  }

  async logoutFull(): Promise<AuthState> {
    this.state = { status: "logged-out" };
    this.pendingPayload = undefined;
    this.http.clearAuth();
    await this.store.clearAll();
    return this.state;
  }

  // ── Internal helpers ─────────────────────────────────────────

  /** Return the token from whatever current state carries one. */
  private getActiveToken(): string | undefined {
    if (this.state.status === "authenticated") return this.state.token;
    if (this.state.status === "session-imported") return this.state.token;
    return this.http.getToken();
  }

  private async fetchDoubleAuthChallenge(): Promise<AuthState> {
    const res = await this.http.postForm(
      doubleAuthUrl({ verb: "get", version: this.http.version }),
      {},
      { includeGtk: false },
    );
    this.http.captureAuthHeaders(res);

    const body = (await res.json()) as RawApiResponse;
    const data = body.data as Record<string, unknown> | undefined;
    const question = decodeBase64String(data?.question);
    const propositions = Array.isArray(data?.propositions) ? data.propositions : [];
    const choices = propositions.flatMap((value) => {
      if (typeof value !== "string") return [];
      return [{ label: decodeBase64String(value), value }];
    });

    if (body.code !== ApiCode.OK || !question || choices.length === 0) {
      this.state = {
        status: "error",
        message: body.message || "Unable to fetch identity verification challenge",
        recoverable: true,
      };
      return this.state;
    }

    this.state = {
      status: "doubleauth-required",
      question,
      choices,
    };
    return this.state;
  }

  private async completeAuthentication(
    body: RawApiResponse,
    creds: { identifiant: string; motdepasse: string },
  ): Promise<AuthState> {
    const token = this.getResolvedToken(body.token);
    const accounts = extractAccounts(body);
    this.state = {
      status: "authenticated",
      token,
      accounts,
    };
    this.pendingPayload = undefined;
    await this.persistSession(token, accounts);
    await this.store.saveCredentials(creds);
    return this.state;
  }

  private getResolvedToken(fallback?: string): string {
    return this.http.getToken() ?? fallback ?? "";
  }

  private async persistSession(token: string, accounts: AccountInfo[]): Promise<void> {
    const session: StoredSession = {
      token,
      cookies: this.http.getCookies(),
      xGtk: this.http.getGtk(),
      twoFaToken: this.http.getTwoFaToken(),
      accounts,
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
    | Array<{
        id: number;
        typeCompte: string;
        nom: string;
        prenom: string;
        nomEtablissement?: string;
        main?: boolean;
        profile?: {
          eleves?: Array<{
            id: number;
            nom: string;
            prenom: string;
            nomEtablissement?: string;
            classe?: { id?: number; libelle?: string; code?: string };
          }>;
        };
      }>
    | undefined;
  if (!Array.isArray(accounts)) return [];
  return accounts.map((account) => {
    const students = Array.isArray(account.profile?.eleves)
      ? account.profile.eleves.map((student) => ({
          id: student.id,
          name: `${student.prenom} ${student.nom}`.trim(),
          ...(student.classe?.id !== undefined ? { classId: student.classe.id } : {}),
          ...(student.classe?.libelle ? { className: student.classe.libelle } : {}),
          ...(student.classe?.code ? { classCode: student.classe.code } : {}),
          ...(student.nomEtablissement ? { establishment: student.nomEtablissement } : {}),
        }))
      : undefined;

    return {
      id: account.id,
      type: account.typeCompte,
      name: `${account.prenom} ${account.nom}`.trim(),
      ...(account.nomEtablissement ? { establishment: account.nomEtablissement } : {}),
      ...(account.main !== undefined ? { main: account.main } : {}),
      ...(students && students.length > 0 ? { students } : {}),
    };
  });
}

function decodeBase64String(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return Buffer.from(value, "base64").toString("utf-8");
}
