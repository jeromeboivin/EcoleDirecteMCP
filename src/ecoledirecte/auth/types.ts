/**
 * Typed auth states for the EcoleDirecte auth state machine.
 *
 * Each state carries exactly the data needed for the next transition.
 * Error states include an actionable message rather than raw API detail.
 */

export type AuthState =
  | LoggedOut
  | LoginPending
  | TotpRequired
  | DoubleAuthRequired
  | Authenticated
  | SessionImported
  | AuthError;

export interface LoggedOut {
  status: "logged-out";
}

export interface LoginPending {
  status: "login-pending";
}

export interface TotpRequired {
  status: "totp-required";
  /** Opaque challenge context from the API, preserved for the continuation call. */
  challenge: Record<string, unknown>;
  /** Whether the server indicated TOTP specifically (vs other 2FA). */
  totp: boolean;
}

export interface DoubleAuthRequired {
  status: "doubleauth-required";
  /** Decoded verification question presented to the user. */
  question: string;
  /** Candidate answers, preserving the encoded values required for submission. */
  choices: Array<{ label: string; value: string }>;
}

export interface Authenticated {
  status: "authenticated";
  token: string;
  /** Account metadata from the login response data. */
  accounts: AccountInfo[];
}

export interface SessionImported {
  status: "session-imported";
  token: string;
  accounts?: AccountInfo[];
}

export interface AuthError {
  status: "error";
  message: string;
  /** If the error is recoverable (e.g. wrong password), the caller can retry. */
  recoverable: boolean;
}

export interface AccountInfo {
  id: number;
  type: string;
  name: string;
  establishment?: string;
  idLogin?: number;
  main?: boolean;
  current?: boolean;
  students?: StudentInfo[];
}

export interface StudentInfo {
  id: number;
  name: string;
  classId?: number;
  className?: string;
  classCode?: string;
  establishment?: string;
}

/** Reusable second-factor material accepted in the login `fa` payload. */
export interface LoginFactor {
  cn: string;
  cv: string;
  uniq?: boolean;
}

/** Persisted credential material (encrypted or plain depending on store). */
export interface StoredCredentials {
  identifiant: string;
  motdepasse: string;
  /** Optional reusable secure-question replay data persisted after successful auth. */
  fa?: LoginFactor[];
}

/** Persisted session material for restore-on-restart. */
export interface StoredSession {
  token: string;
  cookies: Record<string, string>;
  xGtk?: string;
  twoFaToken?: string;
  accounts?: AccountInfo[];
  /** Per-account token cache — avoids redundant renewToken calls when switching establishments. */
  accountTokens?: Record<number, string>;
  version: string;
  savedAt: string; // ISO timestamp
}

/** Login payload sent to the API. */
export interface LoginPayload {
  identifiant: string;
  motdepasse: string;
  isReLogin: boolean;
  uuid: string;
  fa: LoginFactor[];
  /** Accept charter if required by a previous attempt. */
  acceptationCharte?: boolean;
}
