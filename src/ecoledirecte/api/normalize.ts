/**
 * Normalize raw EcoleDirecte API responses into actionable results.
 *
 * The API returns a JSON body with a `code` field (number) and a `message`.
 * HTTP status is always 200 even on auth failures — the semantic status lives
 * inside the JSON.
 */

import type { AuthState } from "../auth/types.js";

export type LoginNextState = "authenticated" | "totp-required" | "doubleauth-required" | "error";

/** Known API status codes observed from reverse engineering. */
export const ApiCode = {
  OK: 200,
  AUTH_2FA: 250, // Auht2Factor in frontend
  ACCOUNT_CREATION: 221,
  BLOCKED: 516,
  BLOCKED_ALT: 535,
  INVALID_CREDENTIALS: 505,
  MAINTENANCE: 517,
  CHARTER_REQUIRED: 520,
  EXPIRED_KEY: 521,
} as const;

export interface RawApiResponse {
  code: number;
  token: string;
  message: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface NormalizedLoginResult {
  /** Next auth state the caller should transition to. */
  nextState: LoginNextState;
  /** API token when login succeeds. */
  token?: string;
  /** Challenge context when 2FA is required. */
  challenge?: Record<string, unknown>;
  /** Human-readable message for error states. */
  message?: string;
  /** Full raw response for debugging. */
  raw: RawApiResponse;
}

export function normalizeLoginResponse(raw: RawApiResponse): NormalizedLoginResult {
  switch (raw.code) {
    case ApiCode.OK:
      return { nextState: "authenticated", token: raw.token, raw };

    case ApiCode.AUTH_2FA: {
      const challenge = (raw.data as Record<string, unknown>) ?? {};
      return {
        nextState: challenge.totp === true ? "totp-required" : "doubleauth-required",
        challenge,
        raw,
      };
    }

    case ApiCode.BLOCKED:
    case ApiCode.BLOCKED_ALT:
      return { nextState: "error", message: "Account blocked", raw };

    case ApiCode.INVALID_CREDENTIALS:
      return { nextState: "error", message: raw.message || "Invalid credentials", raw };

    case ApiCode.CHARTER_REQUIRED:
      return { nextState: "error", message: "Charter acceptance required (unsupported in v1)", raw };

    case ApiCode.MAINTENANCE:
      return { nextState: "error", message: raw.message || "Service unavailable", raw };

    case ApiCode.EXPIRED_KEY:
      return { nextState: "error", message: "Session expired", raw };

    default:
      return { nextState: "error", message: raw.message || `Unexpected code ${raw.code}`, raw };
  }
}

// ── Session probe normalization ────────────────────────────────

export interface ProbeResult {
  valid: boolean;
  /** Refreshed token when the session is still alive. */
  token?: string;
  /** Human-readable reason when the session is invalid. */
  reason?: string;
  raw: RawApiResponse;
}

/**
 * Normalize the response from a lightweight session probe.
 *
 *  - Code 200 → session alive, possibly with a rotated token.
 *  - Code 521 → session expired.
 *  - Anything else → treated as invalid.
 */
export function normalizeProbeResponse(raw: RawApiResponse): ProbeResult {
  if (raw.code === ApiCode.OK) {
    return { valid: true, token: raw.token || undefined, raw };
  }
  if (raw.code === ApiCode.EXPIRED_KEY) {
    return { valid: false, reason: "Session expired", raw };
  }
  return { valid: false, reason: raw.message || `Unexpected code ${raw.code}`, raw };
}
