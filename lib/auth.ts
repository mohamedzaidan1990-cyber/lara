import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7;

// The cookie used to be the literal string "true", which anyone could set in
// their own browser. It is now "<expiry ms>.<hmac>", signed with a key derived
// from ADMIN_PASSWORD — so changing the password also signs everyone out.
function signingKey(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return secret ? createHmac("sha256", "sbb-admin-session").update(secret).digest("hex") : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function createAdminSessionValue(): string | null {
  const key = signingKey();
  if (!key) return null;
  const expires = String(Date.now() + ADMIN_SESSION_SECONDS * 1000);
  return `${expires}.${sign(expires, key)}`;
}

export function isValidAdminSession(value: string | undefined): boolean {
  const key = signingKey();
  if (!key || !value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expires = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires, key), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function isAdmin(): boolean {
  return isValidAdminSession(cookies().get(ADMIN_COOKIE)?.value);
}

export function requireAdmin(): boolean {
  return isAdmin();
}
