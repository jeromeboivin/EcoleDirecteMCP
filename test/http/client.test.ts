import { describe, it, expect, vi } from "vitest";
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

  describe("token", () => {
    it("stores and retrieves token", () => {
      const client = new EdHttpClient();
      expect(client.getToken()).toBeUndefined();
      client.setToken("tok-123");
      expect(client.getToken()).toBe("tok-123");
    });

    it("clears token independently", () => {
      const client = new EdHttpClient();
      client.setToken("tok-123");
      client.clearToken();
      expect(client.getToken()).toBeUndefined();
    });
  });

  describe("2FA token", () => {
    it("stores and retrieves the 2FA token", () => {
      const client = new EdHttpClient();
      expect(client.getTwoFaToken()).toBeUndefined();
      client.setTwoFaToken("twofa-123");
      expect(client.getTwoFaToken()).toBe("twofa-123");
    });

    it("clears the 2FA token independently", () => {
      const client = new EdHttpClient();
      client.setTwoFaToken("twofa-123");
      client.clearTwoFaToken();
      expect(client.getTwoFaToken()).toBeUndefined();
    });
  });

  describe("clearAuth", () => {
    it("resets cookies, GTK, token, and 2FA token", () => {
      const client = new EdHttpClient();
      client.setCookie("A", "1");
      client.setGtk("gtk-val");
      client.setToken("tok-val");
      client.setTwoFaToken("twofa-val");
      client.clearAuth();
      expect(client.getCookies()).toEqual({});
      expect(client.getGtk()).toBeUndefined();
      expect(client.getToken()).toBeUndefined();
      expect(client.getTwoFaToken()).toBeUndefined();
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

  describe("Set-Cookie ingestion", () => {
    it("parses GTK from Set-Cookie headers", () => {
      const client = new EdHttpClient();
      const headers = new Headers();
      // Simulate raw Set-Cookie header
      (headers as any).getSetCookie = () => [
        "GTK=abc123xyz; Path=/; Domain=.ecoledirecte.com",
        "OTHER=val; Path=/",
      ];
      client.ingestSetCookieHeaders(headers);
      expect(client.getCookie("GTK")).toBe("abc123xyz");
      expect(client.getCookie("OTHER")).toBe("val");
    });
  });

  describe("X-GTK from cookie fallback", () => {
    it("sends X-GTK derived from GTK cookie when xGtk is not set", async () => {
      const originalFetch = globalThis.fetch;
      let capturedHeaders: Headers | undefined;
      const fetchMock = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        capturedHeaders = new Headers(init?.headers);
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      globalThis.fetch = fetchMock as typeof fetch;
      try {
        const client = new EdHttpClient();
        client.setCookie("GTK", "cookie-gtk-value");
        // xGtk is NOT set — the client should fall back to the cookie
        await client.postForm("https://example.test", {});
        expect(capturedHeaders?.get("X-GTK")).toBe("cookie-gtk-value");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("prefers explicit xGtk over GTK cookie", async () => {
      const originalFetch = globalThis.fetch;
      let capturedHeaders: Headers | undefined;
      const fetchMock = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        capturedHeaders = new Headers(init?.headers);
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      globalThis.fetch = fetchMock as typeof fetch;
      try {
        const client = new EdHttpClient();
        client.setCookie("GTK", "cookie-gtk-value");
        client.setGtk("explicit-gtk-value");
        await client.postForm("https://example.test", {});
        expect(capturedHeaders?.get("X-GTK")).toBe("explicit-gtk-value");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("omits X-GTK when includeGtk is false", async () => {
      const originalFetch = globalThis.fetch;
      let capturedHeaders: Headers | undefined;
      const fetchMock = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        capturedHeaders = new Headers(init?.headers);
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      globalThis.fetch = fetchMock as typeof fetch;
      try {
        const client = new EdHttpClient();
        client.setCookie("GTK", "cookie-gtk-value");
        await client.postForm("https://example.test", {}, { includeGtk: false });
        expect(capturedHeaders?.get("X-GTK")).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("request headers", () => {
    it("sends a browser-compatible user agent by default", async () => {
      const originalFetch = globalThis.fetch;
      const fetchMock = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const headers = new Headers(init?.headers);
        expect(headers.get("user-agent")).toBe(
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        );
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      globalThis.fetch = fetchMock as typeof fetch;
      try {
        const client = new EdHttpClient();
        await client.postForm("https://example.test", {});
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("fetch timeout", () => {
    it("passes an AbortSignal to GET requests", async () => {
      const originalFetch = globalThis.fetch;
      let capturedSignal: AbortSignal | undefined;
      const fetchMock = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        capturedSignal = init?.signal ?? undefined;
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      globalThis.fetch = fetchMock as typeof fetch;
      try {
        const client = new EdHttpClient();
        await client.get("https://example.test");
        expect(capturedSignal).toBeDefined();
        expect(capturedSignal!.aborted).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("passes an AbortSignal to POST requests", async () => {
      const originalFetch = globalThis.fetch;
      let capturedSignal: AbortSignal | undefined;
      const fetchMock = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        capturedSignal = init?.signal ?? undefined;
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      globalThis.fetch = fetchMock as typeof fetch;
      try {
        const client = new EdHttpClient();
        await client.postForm("https://example.test", { key: "value" });
        expect(capturedSignal).toBeDefined();
        expect(capturedSignal!.aborted).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
