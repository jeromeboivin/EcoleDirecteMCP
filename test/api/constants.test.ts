import { describe, it, expect } from "vitest";
import { loginUrl, API_BASE, API_VERSION, DEFAULT_APP_VERSION } from "../../src/ecoledirecte/api/constants.js";

describe("loginUrl", () => {
  it("returns bootstrap URL with gtk=1", () => {
    const url = loginUrl({ gtk: true });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/login.awp?gtk=1&v=${DEFAULT_APP_VERSION}`);
  });

  it("returns login POST URL without gtk", () => {
    const url = loginUrl();
    expect(url).toBe(`${API_BASE}/${API_VERSION}/login.awp?v=${DEFAULT_APP_VERSION}`);
  });

  it("respects custom version", () => {
    const url = loginUrl({ version: "5.0.0" });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/login.awp?v=5.0.0`);
  });
});
