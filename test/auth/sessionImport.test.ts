import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseSessionFile } from "../../src/ecoledirecte/auth/sessionImport.js";

describe("parseSessionFile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ed-import-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("parses a valid session export file", async () => {
    const file = join(dir, "session.json");
    await writeFile(
      file,
      JSON.stringify({
        token: "tok123",
        cookies: { GTK: "abc", other: "xyz" },
        xGtk: "gtk-header",
        twoFaToken: "twofa-header",
        accounts: [{ id: 1, type: "1", name: "Jane Doe", establishment: "Lycée" }],
        version: "4.96.3",
      }),
    );
    const result = await parseSessionFile(file);
    expect(result.token).toBe("tok123");
    expect(result.cookies).toEqual({ GTK: "abc", other: "xyz" });
    expect(result.xGtk).toBe("gtk-header");
    expect(result.twoFaToken).toBe("twofa-header");
    expect(result.accounts).toEqual([{ id: 1, type: "1", name: "Jane Doe", establishment: "Lycée" }]);
    expect(result.version).toBe("4.96.3");
    expect(result.savedAt).toBeDefined();
  });

  it("normalizes browser-style account payloads with nested students", async () => {
    const file = join(dir, "session.json");
    await writeFile(
      file,
      JSON.stringify({
        token: "tok123",
        cookies: { GTK: "abc" },
        accounts: [
          {
            id: 828,
            idLogin: 4229759,
            typeCompte: "1",
            nom: "ROUDIER-BOIVIN",
            prenom: "Anne",
            nomEtablissement: "Les Marronniers",
            main: true,
            current: true,
            profile: {
              eleves: [
                {
                  id: 1154,
                  nom: "BOIVIN",
                  prenom: "Antonin",
                  nomEtablissement: "Les Marronniers",
                  classe: { id: 18, libelle: "3B", code: "3B" },
                },
              ],
            },
          },
        ],
      }),
    );

    const result = await parseSessionFile(file);

    expect(result.accounts).toEqual([
      {
        id: 828,
        idLogin: 4229759,
        type: "1",
        name: "Anne ROUDIER-BOIVIN",
        establishment: "Les Marronniers",
        main: true,
        current: true,
        students: [
          {
            id: 1154,
            name: "Antonin BOIVIN",
            classId: 18,
            className: "3B",
            classCode: "3B",
            establishment: "Les Marronniers",
          },
        ],
      },
    ]);
  });

  it("defaults version to 4.96.3 when missing", async () => {
    const file = join(dir, "session.json");
    await writeFile(file, JSON.stringify({ token: "t", cookies: {} }));
    const result = await parseSessionFile(file);
    expect(result.version).toBe("4.96.3");
  });

  it("rejects a file without a token", async () => {
    const file = join(dir, "session.json");
    await writeFile(file, JSON.stringify({ cookies: {} }));
    await expect(parseSessionFile(file)).rejects.toThrow("token");
  });

  it("rejects a file without cookies", async () => {
    const file = join(dir, "session.json");
    await writeFile(file, JSON.stringify({ token: "t" }));
    await expect(parseSessionFile(file)).rejects.toThrow("cookies");
  });

  it("rejects invalid JSON", async () => {
    const file = join(dir, "bad.json");
    await writeFile(file, "not json at all");
    await expect(parseSessionFile(file)).rejects.toThrow("not valid JSON");
  });

  it("normalizes uid and isProfEtPersonnel for teacher accounts", async () => {
    const file = join(dir, "session.json");
    await writeFile(
      file,
      JSON.stringify({
        token: "tok-teacher",
        cookies: { GTK: "abc" },
        accounts: [
          {
            id: 221,
            idLogin: 99001,
            typeCompte: "P",
            nom: "DUPONT",
            prenom: "Marie",
            uid: "abc-uid-123",
            isProfEtPersonnel: true,
            main: true,
            current: true,
          },
        ],
      }),
    );

    const result = await parseSessionFile(file);

    expect(result.accounts).toEqual([
      expect.objectContaining({
        id: 221,
        type: "P",
        uid: "abc-uid-123",
        isProfEtPersonnel: true,
      }),
    ]);
  });
});
