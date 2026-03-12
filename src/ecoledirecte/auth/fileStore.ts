/**
 * File-system–based AuthStore with strict permissions.
 *
 * Stores JSON files under a configurable directory (default: ~/.ecoledirecte/).
 * Files are created with mode 0o600 and the directory with 0o700.
 */

import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AuthStore } from "./store.js";
import type { StoredCredentials, StoredSession } from "./types.js";

const CREDS_FILE = "credentials.json";
const SESSION_FILE = "session.json";

export class FileAuthStore implements AuthStore {
  private readonly dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".ecoledirecte");
  }

  private async ensureDir(): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
  }

  private path(file: string): string {
    return join(this.dir, file);
  }

  private async readJson<T>(file: string): Promise<T | undefined> {
    try {
      const raw = await readFile(this.path(file), "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  private async writeJson(file: string, data: unknown): Promise<void> {
    await this.ensureDir();
    await writeFile(this.path(file), JSON.stringify(data, null, 2), {
      mode: 0o600,
      encoding: "utf-8",
    });
  }

  private async removeFile(file: string): Promise<void> {
    try {
      await rm(this.path(file));
    } catch {
      // already absent
    }
  }

  // ── AuthStore implementation ─────────────────────────────────

  async saveCredentials(creds: StoredCredentials): Promise<void> {
    await this.writeJson(CREDS_FILE, creds);
  }

  async loadCredentials(): Promise<StoredCredentials | undefined> {
    return this.readJson<StoredCredentials>(CREDS_FILE);
  }

  async clearCredentials(): Promise<void> {
    await this.removeFile(CREDS_FILE);
  }

  async saveSession(session: StoredSession): Promise<void> {
    await this.writeJson(SESSION_FILE, session);
  }

  async loadSession(): Promise<StoredSession | undefined> {
    return this.readJson<StoredSession>(SESSION_FILE);
  }

  async clearSession(): Promise<void> {
    await this.removeFile(SESSION_FILE);
  }

  async clearAll(): Promise<void> {
    await Promise.all([this.clearCredentials(), this.clearSession()]);
  }
}
