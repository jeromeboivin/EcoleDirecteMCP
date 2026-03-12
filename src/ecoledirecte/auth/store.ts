/**
 * Abstract persistence interface for auth material.
 *
 * Implementations must guarantee:
 * - Credentials and session are stored separately.
 * - On load failure the method returns undefined rather than throwing.
 * - On save, existing data is overwritten atomically.
 */

import type { StoredCredentials, StoredSession } from "./types.js";

export interface AuthStore {
  saveCredentials(creds: StoredCredentials): Promise<void>;
  loadCredentials(): Promise<StoredCredentials | undefined>;
  clearCredentials(): Promise<void>;

  saveSession(session: StoredSession): Promise<void>;
  loadSession(): Promise<StoredSession | undefined>;
  clearSession(): Promise<void>;

  /** Wipe all persisted auth material. */
  clearAll(): Promise<void>;
}
