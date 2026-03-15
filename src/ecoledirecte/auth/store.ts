/**
 * Abstract persistence interface for auth material.
 *
 * Implementations must guarantee:
 * - Credentials and session are stored separately.
 * - On load failure the method returns undefined rather than throwing.
 * - On save, existing data is overwritten atomically.
 *
 * Profile-aware methods accept an optional profile name.
 * When omitted, the implementation should fall back to the active profile
 * or a default single-profile location for migration compatibility.
 */

import type { ProfileName, StoredCredentials, StoredProfileIndex, StoredSession } from "./types.js";

export interface AuthStore {
  saveCredentials(creds: StoredCredentials, profile?: ProfileName): Promise<void>;
  loadCredentials(profile?: ProfileName): Promise<StoredCredentials | undefined>;
  clearCredentials(profile?: ProfileName): Promise<void>;

  saveSession(session: StoredSession, profile?: ProfileName): Promise<void>;
  loadSession(profile?: ProfileName): Promise<StoredSession | undefined>;
  clearSession(profile?: ProfileName): Promise<void>;

  /** Wipe all persisted auth material for a profile, or all profiles when omitted. */
  clearAll(profile?: ProfileName): Promise<void>;

  /** Load the profile index (active profile and known profiles). */
  loadProfileIndex(): Promise<StoredProfileIndex>;
  /** Save the profile index. */
  saveProfileIndex(index: StoredProfileIndex): Promise<void>;
}
