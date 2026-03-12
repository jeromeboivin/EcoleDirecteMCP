import { describe, it, expect } from "vitest";
import { EdHttpClient } from "../../src/ecoledirecte/http/client.js";

describe("EdHttpClient", () => {
  describe("cookie jar", () => {
    it("stores and retrieves cookies", () => {
      const client = new EdHttpClient();
      client.setCookie("GTK", "abc123");
      expect(client.getCookie("GTK")).toBe("abc123");
    });

    it("exports all cookies as a record", () => {
      const client = new EdHttpClient();
      client.setCookie("A", "1");
      client.setCookie("B", "2");
      expect(client.getCookies()).toEqual({ A: "1", B: "2" });
    });

    it("hydrates from a persisted record", () => {
      const client = new EdHttpClient();
      client.loadCookies({ X: "val1", Y: "val2" });
      expect(client.getCookie("X")).toBe("val1");
      expect(client.getCookie("Y")).toBe("val2");
    });
  });

  describe("GTK", () => {
    it("stores and retrieves GTK", () => {
      const client = new EdHttpClient();
      expect(client.getGtk()).toBeUndefined();
      client.setGtk("gtk-value");
      expect(client.getGtk()).toBe("gtk-value");
    });
  });

  describe("version", () => {
    it("defaults to 4.96.3", () => {
      expect(new EdHttpClient().version).toBe("4.96.3");
    });

    it("accepts custom version", () => {
      expect(new EdHttpClient({ version: "5.0.0" }).version).toBe("5.0.0");
    });
  });
});
