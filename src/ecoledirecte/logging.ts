/**
 * Structured logging with credential redaction.
 *
 * All log output goes to stderr (stdout is reserved for MCP stdio transport).
 * Sensitive values are replaced with "[REDACTED]" before output.
 */

const SENSITIVE_KEYS = new Set([
  "motdepasse",
  "password",
  "token",
  "x-gtk",
  "x-token",
  "2fa-token",
  "authorization",
  "cookie",
  "set-cookie",
]);

type LogLevel = "debug" | "info" | "warn" | "error";

function shouldLog(level: LogLevel): boolean {
  const envLevel = process.env.LOG_LEVEL ?? "info";
  const order: LogLevel[] = ["debug", "info", "warn", "error"];
  return order.indexOf(level) >= order.indexOf(envLevel as LogLevel);
}

export function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const entry = data ? `${msg} ${JSON.stringify(redact(data))}` : msg;
  process.stderr.write(`[${level.toUpperCase()}] ${entry}\n`);
}

/** Deep-redact an object, replacing values whose keys match sensitive patterns. */
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redact(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
