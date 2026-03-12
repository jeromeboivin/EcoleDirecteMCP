import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileAuthStore } from "../../src/ecoledirecte/auth/fileStore.js";
import type { StoredCredentials, StoredSession } from "../../src/ecoledirecte/auth/types.js";

describe("FileAuthStore", () => {
  let dir: string;
  let store: FileAuthStore;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ed-test-"));
    store = new FileAuthStore(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const creds: StoredCredentials = { identifiant: "user", motdepasse: "pass" };
  const session: StoredSession = {
    token: "tok",
    cookies: { GTK: "abc" },
    xGtk: "gtk-val",
    version: "4.96.3",
    savedAt: "2026-01-01T00:00:00.000Z",
  };

  it("round-trips credentials", async () => {
    await store.saveCredentials(creds);
    const loaded = await store.loadCredentials();
    expect(loaded).toEqual(creds);
  });

  it("round-trips session", async () => {
    await store.saveSession(session);
    const loaded = await store.loadSession();
    expect(loaded).toEqual(session);
  });

  it("returns undefined when nothing is saved", async () => {
    expect(await store.loadCredentials()).toBeUndefined();
    expect(await store.loadSession()).toBeUndefined();
  });

  it("clears credentials independently", async () => {
    await store.saveCredentials(creds);
    await store.saveSession(session);
    await store.clearCredentials();
    expect(await store.loadCredentials()).toBeUndefined();
    expect(await store.loadSession()).toEqual(session);
  });

  it("clearAll wipes everything", async () => {
    await store.saveCredentials(creds);
    await store.saveSession(session);
    await store.clearAll();
    expect(await store.loadCredentials()).toBeUndefined();
    expect(await store.loadSession()).toBeUndefined();
  });

  it("writes files with restricted permissions", async () => {
    await store.saveCredentials(creds);
    const raw = await readFile(join(dir, "credentials.json"), "utf-8");
    expect(JSON.parse(raw)).toEqual(creds);
  });
});
