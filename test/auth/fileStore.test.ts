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
    store = new FileAuthStore({ dir });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const creds: StoredCredentials = { identifiant: "user", motdepasse: "pass" };
  const credsWithFa: StoredCredentials = {
    identifiant: "user",
    motdepasse: "pass",
    fa: [{ cn: "cn-token", cv: "cv-token", uniq: false }],
  };
  const session: StoredSession = {
    token: "tok",
    cookies: { GTK: "abc" },
    xGtk: "gtk-val",
    version: "4.96.3",
    savedAt: "2026-01-01T00:00:00.000Z",
  };

  it("uses an explicit credentialsFile path when provided", async () => {
    const customPath = join(dir, "custom-creds.json");
    const customStore = new FileAuthStore({ dir, credentialsFile: customPath });
    await customStore.saveCredentials(creds);
    const raw = await readFile(customPath, "utf-8");
    expect(JSON.parse(raw)).toEqual(creds);
    const loaded = await customStore.loadCredentials();
    expect(loaded).toEqual(creds);
  });

  it("defaults credentialsFile to dir/credentials.json", async () => {
    const defaultStore = new FileAuthStore({ dir });
    await defaultStore.saveCredentials(creds);
    const raw = await readFile(join(dir, "credentials.json"), "utf-8");
    expect(JSON.parse(raw)).toEqual(creds);
  });

  it("round-trips credentials", async () => {
    await store.saveCredentials(creds);
    const loaded = await store.loadCredentials();
    expect(loaded).toEqual(creds);
  });

  it("round-trips credentials with persisted fa replay data", async () => {
    await store.saveCredentials(credsWithFa);
    const loaded = await store.loadCredentials();
    expect(loaded).toEqual(credsWithFa);
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

  describe("profile support", () => {
    it("round-trips credentials under a named profile", async () => {
      await store.saveCredentials(creds, "teacher");
      const loaded = await store.loadCredentials("teacher");
      expect(loaded).toEqual(creds);
    });

    it("isolates credentials between profiles", async () => {
      const parentCreds: StoredCredentials = { identifiant: "parent", motdepasse: "parentpass" };
      const teacherCreds: StoredCredentials = { identifiant: "teacher", motdepasse: "teacherpass" };

      await store.saveCredentials(parentCreds, "parent");
      await store.saveCredentials(teacherCreds, "teacher");

      expect(await store.loadCredentials("parent")).toEqual(parentCreds);
      expect(await store.loadCredentials("teacher")).toEqual(teacherCreds);
    });

    it("isolates sessions between profiles", async () => {
      const session2: StoredSession = { ...session, token: "tok2" };
      await store.saveSession(session, "parent");
      await store.saveSession(session2, "teacher");

      expect((await store.loadSession("parent"))?.token).toBe("tok");
      expect((await store.loadSession("teacher"))?.token).toBe("tok2");
    });

    it("clearAll with profile clears only that profile", async () => {
      await store.saveCredentials(creds, "parent");
      await store.saveCredentials(creds, "teacher");
      await store.clearAll("teacher");

      expect(await store.loadCredentials("parent")).toEqual(creds);
      expect(await store.loadCredentials("teacher")).toBeUndefined();
    });

    it("round-trips profile index", async () => {
      const index = { active: "teacher", profiles: ["parent", "teacher"] };
      await store.saveProfileIndex(index);
      const loaded = await store.loadProfileIndex();
      expect(loaded).toEqual(index);
    });

    it("returns empty profile index when none exists", async () => {
      const index = await store.loadProfileIndex();
      expect(index.profiles).toEqual([]);
    });
  });
});
