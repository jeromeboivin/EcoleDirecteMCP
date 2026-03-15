/**
 * File-system–based AuthStore with strict permissions.
 *
 * Stores JSON files under a configurable directory (default: ~/.ecoledirecte/).
 * Files are created with mode 0o600 and the directory with 0o700.
 *
 * Profile-aware: when a profile name is passed, credentials and session are
 * stored under a `profiles/<name>/` subdirectory. Legacy single-profile data
 * lives at the top level for migration compatibility.
 */

import { mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AuthStore } from "./store.js";
import type { ProfileName, StoredCredentials, StoredProfileIndex, StoredSession } from "./types.js";

const CREDS_FILE = "credentials.json";
const SESSION_FILE = "session.json";
const PROFILE_INDEX_FILE = "profiles.json";
const PROFILES_DIR = "profiles";
const DEFAULT_DIR = join(homedir(), ".ecoledirecte");

export class FileAuthStore implements AuthStore {
  private readonly dir: string;
  private readonly credentialsPath: string;

  constructor(opts?: { dir?: string; credentialsFile?: string }) {
    this.dir = opts?.dir ?? DEFAULT_DIR;
    this.credentialsPath = opts?.credentialsFile ?? join(this.dir, CREDS_FILE);
  }

  private async ensureDir(dir?: string): Promise<void> {
    await mkdir(dir ?? this.dir, { recursive: true, mode: 0o700 });
  }

  private profileDir(profile: ProfileName): string {
    return join(this.dir, PROFILES_DIR, profile);
  }

  private path(file: string): string {
    return join(this.dir, file);
  }

  private async readJson<T>(filePath: string): Promise<T | undefined> {
    try {
      const raw = await readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    const dir = join(filePath, "..");
    await this.ensureDir(dir);
    await writeFile(filePath, JSON.stringify(data, null, 2), {
      mode: 0o600,
      encoding: "utf-8",
    });
  }

  private async removeFile(filePath: string): Promise<void> {
    try {
      await rm(filePath);
    } catch {
      // already absent
    }
  }

  // ── Credential paths ─────────────────────────────────────────

  private credentialsPathFor(profile?: ProfileName): string {
    if (profile) return join(this.profileDir(profile), CREDS_FILE);
    return this.credentialsPath;
  }

  private sessionPathFor(profile?: ProfileName): string {
    if (profile) return join(this.profileDir(profile), SESSION_FILE);
    return this.path(SESSION_FILE);
  }

  // ── AuthStore implementation ─────────────────────────────────

  async saveCredentials(creds: StoredCredentials, profile?: ProfileName): Promise<void> {
    await this.writeJson(this.credentialsPathFor(profile), creds);
  }

  async loadCredentials(profile?: ProfileName): Promise<StoredCredentials | undefined> {
    return this.readJson<StoredCredentials>(this.credentialsPathFor(profile));
  }

  async clearCredentials(profile?: ProfileName): Promise<void> {
    await this.removeFile(this.credentialsPathFor(profile));
  }

  async saveSession(session: StoredSession, profile?: ProfileName): Promise<void> {
    await this.writeJson(this.sessionPathFor(profile), session);
  }

  async loadSession(profile?: ProfileName): Promise<StoredSession | undefined> {
    return this.readJson<StoredSession>(this.sessionPathFor(profile));
  }

  async clearSession(profile?: ProfileName): Promise<void> {
    await this.removeFile(this.sessionPathFor(profile));
  }

  async clearAll(profile?: ProfileName): Promise<void> {
    if (profile) {
      await Promise.all([
        this.clearCredentials(profile),
        this.clearSession(profile),
      ]);
      return;
    }
    // Clear legacy top-level files and all profile directories
    await Promise.all([this.clearCredentials(), this.clearSession()]);
    try {
      await rm(this.path(PROFILES_DIR), { recursive: true, force: true });
    } catch {
      // absent
    }
  }

  // ── Profile index ────────────────────────────────────────────

  async loadProfileIndex(): Promise<StoredProfileIndex> {
    const stored = await this.readJson<StoredProfileIndex>(this.path(PROFILE_INDEX_FILE));
    if (stored && Array.isArray(stored.profiles)) return stored;

    // Infer from filesystem: list subdirectories under profiles/
    const profiles: ProfileName[] = [];
    try {
      const entries = await readdir(this.path(PROFILES_DIR), { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) profiles.push(entry.name);
      }
    } catch {
      // no profiles dir yet
    }
    return { profiles };
  }

  async saveProfileIndex(index: StoredProfileIndex): Promise<void> {
    await this.writeJson(this.path(PROFILE_INDEX_FILE), index);
  }
}
