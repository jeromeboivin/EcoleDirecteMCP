/**
 * Cookie-aware HTTP client for the EcoleDirecte private API.
 *
 * Manages a simple cookie jar, common headers, the GTK bootstrap dance,
 * and the form-urlencoded `data=` wrapper the API expects.
 */

import { CONTENT_TYPE_FORM } from "../api/constants.js";

export class EdHttpClient {
  private cookies = new Map<string, string>();
  private xGtk: string | undefined;
  private xToken: string | undefined;
  readonly version: string;

  constructor(opts: { version?: string } = {}) {
    this.version = opts.version ?? "4.96.3";
  }

  // ── Cookie jar ───────────────────────────────────────────────

  getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  getCookies(): Record<string, string> {
    return Object.fromEntries(this.cookies);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  /** Parse `Set-Cookie` header values (simplified; no path/domain handling needed). */
  ingestSetCookieHeaders(headers: Headers): void {
    const raw = headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const eqIdx = pair.indexOf("=");
      if (eqIdx < 1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      this.cookies.set(name, value);
    }
  }

  /** Hydrate cookie jar from a persisted record (session restore / import). */
  loadCookies(cookies: Record<string, string>): void {
    for (const [k, v] of Object.entries(cookies)) {
      this.cookies.set(k, v);
    }
  }

  // ── GTK ──────────────────────────────────────────────────────

  getGtk(): string | undefined {
    return this.xGtk;
  }

  setGtk(value: string): void {
    this.xGtk = value;
  }

  // ── Token ────────────────────────────────────────────────────

  getToken(): string | undefined {
    return this.xToken;
  }

  setToken(value: string): void {
    this.xToken = value;
  }

  clearToken(): void {
    this.xToken = undefined;
  }

  // ── Request helpers ──────────────────────────────────────────

  private buildCookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private commonHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      "User-Agent": `EcoleDirecteMCP/0.1`,
      Accept: "application/json, text/plain, */*",
    };
    const cookieStr = this.buildCookieHeader();
    if (cookieStr) h["Cookie"] = cookieStr;
    if (this.xGtk) h["X-GTK"] = this.xGtk;
    if (this.xToken) h["X-Token"] = this.xToken;
    return h;
  }

  /** Plain GET with cookie + GTK headers. */
  async get(url: string): Promise<Response> {
    return fetch(url, {
      method: "GET",
      headers: this.commonHeaders(),
      redirect: "manual",
    });
  }

  /**
   * POST with the `data=<json>` form-urlencoded wrapper the API expects.
   * The caller passes a plain object; we JSON-stringify and wrap it.
   */
  async postForm(url: string, data: Record<string, unknown>): Promise<Response> {
    const body = `data=${encodeURIComponent(JSON.stringify(data))}`;
    return fetch(url, {
      method: "POST",
      headers: {
        ...this.commonHeaders(),
        "Content-Type": CONTENT_TYPE_FORM,
      },
      body,
      redirect: "manual",
    });
  }

  /** Extract auth-relevant response headers after a login call. */
  captureAuthHeaders(res: Response): void {
    const gtk = res.headers.get("X-GTK");
    if (gtk) this.xGtk = gtk;
    const token = res.headers.get("X-Token");
    if (token) this.xToken = token;
    this.ingestSetCookieHeaders(res.headers);
  }

  /** Reset all auth state (cookies, GTK, token). */
  clearAuth(): void {
    this.cookies.clear();
    this.xGtk = undefined;
    this.xToken = undefined;
  }
}
