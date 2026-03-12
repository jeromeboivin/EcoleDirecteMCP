import { describe, it, expect } from "vitest";
import {
  normalizeLoginResponse,
  normalizeProbeResponse,
  ApiCode,
} from "../../src/ecoledirecte/api/normalize.js";
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

  it("returns error on expired key (521)", () => {
    const res: RawApiResponse = { ...baseResponse, code: ApiCode.EXPIRED_KEY };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toContain("expired");
  });

  it("returns error on maintenance (517)", () => {
    const res: RawApiResponse = { ...baseResponse, code: ApiCode.MAINTENANCE, message: "En maintenance" };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toBe("En maintenance");
  });

  it("returns error on charter required (520)", () => {
    const res: RawApiResponse = { ...baseResponse, code: ApiCode.CHARTER_REQUIRED };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toContain("Charter");
  });

  it("returns error on blocked alt (535)", () => {
    const res: RawApiResponse = { ...baseResponse, code: ApiCode.BLOCKED_ALT };
    const result = normalizeLoginResponse(res);
    expect(result.nextState).toBe("error");
    expect(result.message).toContain("blocked");
  });
});

describe("normalizeProbeResponse", () => {
  it("returns valid on code 200 with rotated token", () => {
    const res: RawApiResponse = { code: 200, token: "tok-new", message: "" };
    const result = normalizeProbeResponse(res);
    expect(result.valid).toBe(true);
    expect(result.token).toBe("tok-new");
  });

  it("returns valid without token when token is empty", () => {
    const res: RawApiResponse = { code: 200, token: "", message: "" };
    const result = normalizeProbeResponse(res);
    expect(result.valid).toBe(true);
    expect(result.token).toBeUndefined();
  });

  it("returns invalid on expired key (521)", () => {
    const res: RawApiResponse = { code: 521, token: "", message: "" };
    const result = normalizeProbeResponse(res);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("returns invalid on unexpected code", () => {
    const res: RawApiResponse = { code: 500, token: "", message: "Internal" };
    const result = normalizeProbeResponse(res);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Internal");
  });
});
