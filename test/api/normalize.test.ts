import { describe, it, expect } from "vitest";
import { normalizeLoginResponse, ApiCode } from "../../src/ecoledirecte/api/normalize.js";
import type { RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";

const baseResponse: RawApiResponse = { code: 200, token: "", message: "" };

describe("normalizeLoginResponse", () => {
  it("returns authenticated on code 200", () => {
    const res: RawApiResponse = { ...baseResponse, code: ApiCode.OK, token: "tok123" };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("authenticated");
    expect(result.token).toBe("tok123");
  });

  it("returns totp-required on code 250", () => {
    const res: RawApiResponse = {
      ...baseResponse,
      code: ApiCode.AUTH_2FA,
      data: { totp: true, question: "xxx" },
    };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("totp-required");
    expect(result.challenge).toEqual({ totp: true, question: "xxx" });
  });

  it("returns error on blocked account (516)", () => {
    const res: RawApiResponse = { ...baseResponse, code: ApiCode.BLOCKED };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toContain("blocked");
  });

  it("returns error on invalid credentials (505)", () => {
    const res: RawApiResponse = {
      ...baseResponse,
      code: ApiCode.INVALID_CREDENTIALS,
      message: "Mauvais identifiants",
    };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toBe("Mauvais identifiants");
  });

  it("returns error on unknown code", () => {
    const res: RawApiResponse = { ...baseResponse, code: 999 };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toContain("999");
  });
});
