/** EcoleDirecte API endpoints, headers, and version defaults. */

export const API_BASE = "https://api.ecoledirecte.com";
export const API_VERSION = "v3";

/** Default app version sent in query strings. Overrideable via config. */
export const DEFAULT_APP_VERSION = "4.96.3";

export function loginUrl(opts: { gtk?: boolean; version?: string } = {}): string {
  const v = opts.version ?? DEFAULT_APP_VERSION;
  const base = `${API_BASE}/${API_VERSION}/login.awp`;
  if (opts.gtk) return `${base}?gtk=1&v=${v}`;
  return `${base}?v=${v}`;
}

/** Headers the server exposes via CORS that we may need to capture. */
export const EXPOSED_HEADERS = [
  "X-Token",
  "X-GTK",
  "2FA-Token",
  "Authorization",
  "X-Client",
  "X-Code",
  "WOPI-Token",
  "STREAM-Token",
] as const;

export const CONTENT_TYPE_FORM = "application/x-www-form-urlencoded";
