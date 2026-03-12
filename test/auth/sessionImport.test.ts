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
        version: "4.96.3",
      }),
    );
    const result = await parseSessionFile(file);
    expect(result.token).toBe("tok123");
    expect(result.cookies).toEqual({ GTK: "abc", other: "xyz" });
    expect(result.xGtk).toBe("gtk-header");
    expect(result.version).toBe("4.96.3");
    expect(result.savedAt).toBeDefined();
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
});
