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
import { doubleAuthUrl, loginUrl, probeUrl, renewTokenUrl } from "../api/constants.js";
import { ApiCode, normalizeLoginResponse, normalizeProbeResponse, type RawApiResponse } from "../api/normalize.js";
import type { AuthStore } from "./store.js";
import type {
  AuthState,
  LoginFactor,
  LoginPayload,
  StoredCredentials,
  StoredSession,
  AccountInfo,
} from "./types.js";

export class AuthService {
  private state: AuthState = { status: "logged-out" };
  private pendingPayload: LoginPayload | undefined;
  /** GTK captured after the initial login POST, preserved for the final replay. */
  private loginGtk: string | undefined;
  /** In-flight login promise — prevents concurrent logins from corrupting state. */
  private loginInFlight: Promise<AuthState> | undefined;
  /** Per-account token cache — avoids redundant renewToken API calls. */
  private accountTokens = new Map<number, string>();

  constructor(
    private readonly http: EdHttpClient,
    private readonly store: AuthStore,
  ) {}

  getState(): AuthState {
    return this.state;
  }

  // ── Direct login ─────────────────────────────────────────────

  async loginFromStore(): Promise<AuthState> {
    try {
      const creds = await this.store.loadCredentials();
      if (!creds) {
        this.state = {
          status: "error",
          message:
            "No credentials file found. Create a JSON file with {\"identifiant\": \"…\", \"motdepasse\": \"…\"} " +
            "at the path given by ECOLEDIRECTE_CREDENTIALS_FILE, or at ~/.ecoledirecte/credentials.json.",
          recoverable: true,
        };
        return this.state;
      }
      return this.login(creds.identifiant, creds.motdepasse, creds.fa);
    } catch (error) {
      this.state = {
        status: "error",
        message: `Login failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
  }

  async login(identifiant: string, motdepasse: string, persistedFa?: LoginFactor[]): Promise<AuthState> {
    if (this.loginInFlight) return this.loginInFlight;

    const task = this.performLogin(identifiant, motdepasse, persistedFa);
    this.loginInFlight = task;
    try {
      return await task;
    } finally {
      this.loginInFlight = undefined;
    }
  }

  private async performLogin(identifiant: string, motdepasse: string, persistedFa?: LoginFactor[]): Promise<AuthState> {
    this.http.clearAuth();
    this.loginGtk = undefined;
    this.state = { status: "login-pending" };

    try {
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
      const reusableFa = normalizeLoginFactors(persistedFa);
      const payload: LoginPayload = {
        identifiant,
        motdepasse,
        isReLogin: false,
        uuid: "",
        fa: reusableFa,
      };
      this.pendingPayload = payload;

      const postUrl = loginUrl({ version: this.http.version });
      const res = await this.http.postForm(postUrl, payload as unknown as Record<string, unknown>);
      this.http.captureAuthHeaders(res);

      const body = (await res.json()) as RawApiResponse;
      const result = normalizeLoginResponse(body);

      switch (result.nextState) {
        case "authenticated": {
          return this.completeAuthentication(body, buildStoredCredentials(identifiant, motdepasse, reusableFa));
        }

        case "totp-required": {
          const totp = !!(result.challenge?.totp ?? true);
          this.loginGtk = this.http.getGtk();
          this.state = {
            status: "totp-required",
            challenge: result.challenge ?? {},
            totp,
          };
          break;
        }

        case "doubleauth-required":
          this.loginGtk = this.http.getGtk();
          return this.fetchDoubleAuthChallenge();

        default:
          if (reusableFa.length > 0 && body.code === ApiCode.INVALID_CREDENTIALS) {
            return this.performLogin(identifiant, motdepasse);
          }
          this.state = {
            status: "error",
            message: result.message ?? "Login failed",
            recoverable: result.nextState === "error",
          };
      }

      return this.state;
    } catch (error) {
      this.state = {
        status: "error",
        message: `Login failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
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

    try {
      const payload: LoginPayload = {
        ...this.pendingPayload,
        fa: [{ cv: code, cn: "" }],
      };

      const body = await this.replayLogin(payload);
      const result = normalizeLoginResponse(body);

      if (result.nextState === "authenticated") {
        return this.completeAuthentication(
          body,
          buildStoredCredentials(
            this.pendingPayload.identifiant,
            this.pendingPayload.motdepasse,
            this.pendingPayload.fa,
          ),
        );
      }

      this.state = {
        status: "error",
        message: result.message ?? "TOTP verification failed",
        recoverable: true,
      };

      return this.state;
    } catch (error) {
      this.state = {
        status: "error",
        message: `TOTP submission failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
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

    try {
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
        fa: [{ cn, cv, uniq: false }],
      };

      const loginBody = await this.replayLogin(payload);
      const result = normalizeLoginResponse(loginBody);

      if (result.nextState === "authenticated") {
        return this.completeAuthentication(
          loginBody,
          buildStoredCredentials(this.pendingPayload.identifiant, this.pendingPayload.motdepasse, payload.fa),
        );
      }

      this.state = {
        status: "error",
        message: result.message ?? "Identity verification failed",
        recoverable: true,
      };
      return this.state;
    } catch (error) {
      this.state = {
        status: "error",
        message: `Identity verification failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
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
          // Update cached token for the current account
          const currentId = this.state.accounts.find((a) => a.current === true)?.id;
          if (currentId !== undefined) this.accountTokens.set(currentId, resolvedToken);

          this.state = { ...this.state, token: resolvedToken };
          await this.persistSession(resolvedToken, this.state.accounts);
          return this.state;
        }
        const rawAccounts = this.state.status === "session-imported" ? this.state.accounts ?? [] : [];
        const accounts = ensureCurrentFlag(rawAccounts);
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
      this.clearAccountTokens();

      // Try saved credentials as fallback
      const creds = await this.store.loadCredentials();
      if (creds) {
        return this.login(creds.identifiant, creds.motdepasse, creds.fa);
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
        message: `Session validation failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
  }

  // ── Session restore on startup ───────────────────────────────

  async switchAccount(accountId: number): Promise<AuthState> {
    const current = this.state.status === "session-imported" ? await this.validateSession() : this.state;
    if (current.status !== "authenticated") {
      return current;
    }

    const target = current.accounts.find((account) => account.id === accountId);
    if (!target) {
      this.state = {
        status: "error",
        message: `Unknown accountId ${accountId}.`,
        recoverable: true,
      };
      return this.state;
    }

    if (current.accounts.length === 1 || target.current === true) {
      return current;
    }

    // Try the per-account token cache before making an API call
    const cachedToken = this.accountTokens.get(accountId);
    if (cachedToken) {
      this.http.setToken(cachedToken);
      const accounts = markCurrentAccount(current.accounts, accountId);
      this.state = { status: "authenticated", token: cachedToken, accounts };
      await this.persistSession(cachedToken, accounts);
      return this.state;
    }

    if (target.idLogin === undefined) {
      this.state = {
        status: "error",
        message: `Account switching requires idLogin metadata for accountId ${accountId}. Re-import a browser session that includes browser account metadata or authenticate again.`,
        recoverable: true,
      };
      return this.state;
    }

    try {
      const res = await this.http.postForm(
        renewTokenUrl({ version: this.http.version }),
        { idUser: target.idLogin, uuid: "" },
        { includeGtk: false },
      );
      this.http.captureAuthHeaders(res);

      const body = (await res.json()) as RawApiResponse;
      if (body.code !== ApiCode.OK) {
        this.state = {
          status: "error",
          message: body.message || `Unable to switch to accountId ${accountId}.`,
          recoverable: true,
        };
        return this.state;
      }

      const resolvedAccountId = extractCurrentAccountId(body) ?? accountId;
      if (resolvedAccountId !== accountId) {
        this.state = {
          status: "error",
          message: `Requested accountId ${accountId}, but EcoleDirecte returned accountId ${resolvedAccountId}.`,
          recoverable: true,
        };
        return this.state;
      }

      const token = this.getResolvedToken(body.token);
      const accounts = mergeAccountsAfterSwitch(
        markCurrentAccount(current.accounts, resolvedAccountId),
        body,
      );

      // Cache the token for this account
      this.accountTokens.set(accountId, token);

      this.state = {
        status: "authenticated",
        token,
        accounts,
      };
      await this.persistSession(token, accounts);
      return this.state;
    } catch (error) {
      this.state = {
        status: "error",
        message: `Account switch failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
  }

  /** Invalidate per-account token cache (e.g. after session expired). */
  private clearAccountTokens(): void {
    this.accountTokens.clear();
  }

  async restore(): Promise<AuthState> {
    try {
      const session = await this.store.loadSession();
      if (session) {
        this.http.loadCookies(session.cookies);
        if (session.xGtk) this.http.setGtk(session.xGtk);
        if (session.twoFaToken) this.http.setTwoFaToken(session.twoFaToken);
        this.http.setToken(session.token);

        // Restore per-account token cache from persisted session
        if (session.accountTokens) {
          for (const [id, token] of Object.entries(session.accountTokens)) {
            this.accountTokens.set(Number(id), token);
          }
        }

        // Ensure current flag is set on restored accounts
        const accounts = ensureCurrentFlag(session.accounts);

        this.state = {
          status: "session-imported",
          token: session.token,
          accounts,
        };
        return this.validateSession();
      }

      const creds = await this.store.loadCredentials();
      if (creds) {
        return this.login(creds.identifiant, creds.motdepasse, creds.fa);
      }

      return this.state; // still logged-out
    } catch (error) {
      this.state = {
        status: "error",
        message: `Session restore failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
  }

  // ── Logout ───────────────────────────────────────────────────

  async logout(): Promise<AuthState> {
    this.state = { status: "logged-out" };
    this.pendingPayload = undefined;
    this.loginGtk = undefined;
    this.clearAccountTokens();
    this.http.clearAuth();
    await this.store.clearSession();
    return this.state;
  }

  async logoutFull(): Promise<AuthState> {
    this.state = { status: "logged-out" };
    this.pendingPayload = undefined;
    this.loginGtk = undefined;
    this.clearAccountTokens();
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
    try {
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
    } catch (error) {
      this.state = {
        status: "error",
        message: `Identity verification challenge failed: ${formatError(error)}`,
        recoverable: true,
      };
      return this.state;
    }
  }

  private async completeAuthentication(
    body: RawApiResponse,
    creds: StoredCredentials,
  ): Promise<AuthState> {
    const token = this.getResolvedToken(body.token);
    const accounts = applyCurrentAccount(extractAccounts(body), extractCurrentAccountId(body));

    // Cache the initial token for the current account
    this.clearAccountTokens();
    const currentAccountId = accounts.find((a) => a.current === true)?.id;
    if (currentAccountId !== undefined) {
      this.accountTokens.set(currentAccountId, token);
    }

    this.state = {
      status: "authenticated",
      token,
      accounts,
    };
    this.pendingPayload = undefined;
    this.loginGtk = undefined;
    await this.persistSession(token, accounts);
    await this.store.saveCredentials(creds);
    return this.state;
  }

  private async replayLogin(payload: LoginPayload): Promise<RawApiResponse> {
    if (this.loginGtk) this.http.setGtk(this.loginGtk);

    const res = await this.http.postForm(
      loginUrl({ version: this.http.version }),
      payload as unknown as Record<string, unknown>,
      { includeToken: false, includeTwoFaToken: false },
    );
    this.http.captureAuthHeaders(res);
    return (await res.json()) as RawApiResponse;
  }

  private getResolvedToken(fallback?: string): string {
    return this.http.getToken() ?? fallback ?? "";
  }

  private async persistSession(token: string, accounts: AccountInfo[]): Promise<void> {
    const accountTokens: Record<number, string> = {};
    for (const [id, t] of this.accountTokens) {
      accountTokens[id] = t;
    }
    const session: StoredSession = {
      token,
      cookies: this.http.getCookies(),
      xGtk: this.http.getGtk(),
      twoFaToken: this.http.getTwoFaToken(),
      accounts,
      ...(Object.keys(accountTokens).length > 0 ? { accountTokens } : {}),
      version: this.http.version,
      savedAt: new Date().toISOString(),
    };
    await this.store.saveSession(session);
  }
}

function normalizeLoginFactors(fa: unknown): LoginFactor[] {
  if (!Array.isArray(fa)) return [];
  return fa.flatMap((factor) => {
    const candidate = factor as Record<string, unknown>;
    if (typeof candidate.cn !== "string" || typeof candidate.cv !== "string") return [];
    return [{
      cn: candidate.cn,
      cv: candidate.cv,
      ...(typeof candidate.uniq === "boolean" ? { uniq: candidate.uniq } : {}),
    }];
  });
}

function buildStoredCredentials(
  identifiant: string,
  motdepasse: string,
  fa?: LoginFactor[],
): StoredCredentials {
  const reusableFa = normalizeLoginFactors(fa);
  return {
    identifiant,
    motdepasse,
    ...(reusableFa.length > 0 ? { fa: reusableFa } : {}),
  };
}

/** Best-effort extraction of account info from a successful login response. */
function extractAccounts(body: RawApiResponse): AccountInfo[] {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return [];
  const accounts = data.accounts as unknown[] | undefined;
  if (!Array.isArray(accounts)) return [];
  return accounts.flatMap((account) => {
    const normalized = normalizeAccount(account);
    return normalized ? [normalized] : [];
  });
}

function extractCurrentAccountId(body: RawApiResponse): number | undefined {
  const data = body.data as Record<string, unknown> | undefined;
  return typeof data?.id === "number" ? data.id : undefined;
}

function applyCurrentAccount(accounts: AccountInfo[], currentAccountId?: number): AccountInfo[] {
  if (currentAccountId !== undefined) return markCurrentAccount(accounts, currentAccountId);
  // Login responses lack data.id — infer current from the main flag or first account
  const inferredId = accounts.find((a) => a.main === true)?.id ?? accounts[0]?.id;
  if (inferredId !== undefined) return markCurrentAccount(accounts, inferredId);
  return accounts;
}

function markCurrentAccount(accounts: AccountInfo[], currentAccountId: number): AccountInfo[] {
  return accounts.map((account) => ({
    ...account,
    current: account.id === currentAccountId,
  }));
}

function normalizeAccount(account: unknown): AccountInfo | undefined {
  const candidate = account as Record<string, unknown>;
  if (typeof candidate.id !== "number" || typeof candidate.typeCompte !== "string") {
    return undefined;
  }

  const firstName = typeof candidate.prenom === "string" ? candidate.prenom.trim() : "";
  const lastName = typeof candidate.nom === "string" ? candidate.nom.trim() : "";
  const name = `${firstName} ${lastName}`.trim();
  if (!name) return undefined;

  const profile = candidate.profile as Record<string, unknown> | undefined;
  const students = Array.isArray(profile?.eleves)
    ? profile.eleves.flatMap((student) => normalizeStudent(student))
    : undefined;

  return {
    id: candidate.id,
    type: candidate.typeCompte,
    name,
    ...(typeof candidate.nomEtablissement === "string" ? { establishment: candidate.nomEtablissement } : {}),
    ...(typeof candidate.idLogin === "number" ? { idLogin: candidate.idLogin } : {}),
    ...(typeof candidate.main === "boolean" ? { main: candidate.main } : {}),
    ...(typeof candidate.current === "boolean" ? { current: candidate.current } : {}),
    ...(students && students.length > 0 ? { students } : {}),
  };
}

function normalizeStudent(student: unknown) {
  const candidate = student as Record<string, unknown>;
  if (typeof candidate.id !== "number") return [];

  const firstName = typeof candidate.prenom === "string" ? candidate.prenom.trim() : "";
  const lastName = typeof candidate.nom === "string" ? candidate.nom.trim() : "";
  const name = `${firstName} ${lastName}`.trim();
  if (!name) return [];

  const classe = candidate.classe as Record<string, unknown> | undefined;

  return [{
    id: candidate.id,
    name,
    ...(typeof classe?.id === "number" ? { classId: classe.id } : {}),
    ...(typeof classe?.libelle === "string" ? { className: classe.libelle } : {}),
    ...(typeof classe?.code === "string" ? { classCode: classe.code } : {}),
    ...(typeof candidate.nomEtablissement === "string" ? { establishment: candidate.nomEtablissement } : {}),
  }];
}

/**
 * Ensure at least one account has `current: true`.
 * If none does, infer from `main` flag or fall back to first account.
 */
function ensureCurrentFlag(accounts?: AccountInfo[]): AccountInfo[] {
  if (!accounts || accounts.length === 0) return accounts ?? [];
  const hasCurrent = accounts.some((a) => a.current === true);
  if (hasCurrent) return accounts;
  const inferredId = accounts.find((a) => a.main === true)?.id ?? accounts[0]?.id;
  if (inferredId !== undefined) return markCurrentAccount(accounts, inferredId);
  return accounts;
}

/**
 * After a renewToken (account switch), merge any enriched account/student data
 * from the response back into our existing account list. The renewToken response
 * may contain updated profile/student data for the newly-active account.
 */
function mergeAccountsAfterSwitch(accounts: AccountInfo[], body: RawApiResponse): AccountInfo[] {
  if (!body.data || typeof body.data !== "object") return accounts;
  const data = body.data as Record<string, unknown>;
  const rawAccounts = Array.isArray(data.accounts) ? data.accounts : undefined;
  if (!rawAccounts || rawAccounts.length === 0) return accounts;

  // Build a lookup of the freshly returned accounts keyed by id
  const fresh = new Map<number, AccountInfo>();
  for (const raw of rawAccounts) {
    const normalized = normalizeAccount(raw);
    if (normalized) fresh.set(normalized.id, normalized);
  }

  // Merge: prefer fresh student data when available, keep existing otherwise
  return accounts.map((existing) => {
    const update = fresh.get(existing.id);
    if (!update) return existing;
    return {
      ...existing,
      // Prefer fresh students if the response actually carried them
      ...(update.students && update.students.length > 0 ? { students: update.students } : {}),
      // Preserve establishment if fresh data has it
      ...(update.establishment ? { establishment: update.establishment } : {}),
    };
  });
}

function decodeBase64String(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return Buffer.from(value, "base64").toString("utf-8");
}

/** Format an error with its cause for actionable diagnostics. */
function formatError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  if (error.name === "TimeoutError") {
    return "Request timed out — the EcoleDirecte API did not respond in time";
  }
  const cause = error.cause;
  if (cause instanceof Error) {
    if (cause.name === "TimeoutError") {
      return "Request timed out — the EcoleDirecte API did not respond in time";
    }
    return `${error.message} (${cause.message})`;
  }
  return error.message;
}
