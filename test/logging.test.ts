import { describe, it, expect } from "vitest";
import { redact } from "../src/ecoledirecte/logging.js";

describe("redact", () => {
  it("redacts sensitive keys", () => {
    const input = {
      identifiant: "user",
      motdepasse: "secret",
      token: "tok123",
      code: 200,
    };
    const result = redact(input);
    expect(result.identifiant).toBe("user");
    expect(result.motdepasse).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect(result.code).toBe(200);
  });

  it("redacts nested sensitive keys", () => {
    const input = {
      headers: {
        "X-GTK": "secret-gtk",
        "Content-Type": "text/plain",
      },
    };
    const result = redact(input) as { headers: Record<string, unknown> };
    expect(result.headers["X-GTK"]).toBe("[REDACTED]");
    expect(result.headers["Content-Type"]).toBe("text/plain");
  });

  it("is case-insensitive on key matching", () => {
    const result = redact({ Cookie: "val", AUTHORIZATION: "val2" });
    expect(result.Cookie).toBe("[REDACTED]");
    expect(result.AUTHORIZATION).toBe("[REDACTED]");
  });

  it("passes through non-sensitive values unchanged", () => {
    const input = { status: "ok", count: 42 };
    expect(redact(input)).toEqual(input);
  });
});
