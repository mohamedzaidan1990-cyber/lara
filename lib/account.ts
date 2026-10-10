import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";

// Customer accounts: phone number + 6-digit PIN (no email, no SMS codes).
// `accounts.phone` holds the canonical phone (see sbb_normalize_phone in
// lib/db.ts) and links the account to every order placed under that number.

export const ACCOUNT_COOKIE = "sbb_account";
export const SESSION_DAYS = 180;
export const PIN_RE = /^\d{6}$/;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export interface Account {
  id: string;
  phone: string;
  full_name: string;
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const given = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(given, expected);
}

export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Canonical phone via the same SQL function the customers table uses. */
export async function normalizePhone(raw: string): Promise<string | null> {
  const sql = getSql();
  const rows = (await sql`select sbb_normalize_phone(${raw}::text) as p`) as Array<{ p: string | null }>;
  return rows[0]?.p ?? null;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row and sets the cookie. Call from a route handler. */
export async function startSession(accountId: string): Promise<void> {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  await sql`
    insert into account_sessions (token_hash, account_id, expires_at)
    values (${tokenHash(token)}, ${accountId}, now() + make_interval(days => ${SESSION_DAYS}::int))
  `;
  await sql`update accounts set last_login_at = now() where id = ${accountId}`;
  cookies().set(ACCOUNT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}

export async function endSession(): Promise<void> {
  const token = cookies().get(ACCOUNT_COOKIE)?.value;
  if (token) {
    const sql = getSql();
    await sql`delete from account_sessions where token_hash = ${tokenHash(token)}`;
  }
  cookies().set(ACCOUNT_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getCurrentAccount(): Promise<Account | null> {
  const token = cookies().get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;
  const sql = getSql();
  const rows = (await sql`
    select a.id, a.phone, a.full_name
    from account_sessions s join accounts a on a.id = s.account_id
    where s.token_hash = ${tokenHash(token)} and s.expires_at > now()
  `) as Account[];
  return rows[0] ?? null;
}

/** Signs out every device — used when an admin resets a PIN. */
export async function endAllSessions(accountId: string): Promise<void> {
  const sql = getSql();
  await sql`delete from account_sessions where account_id = ${accountId}`;
}

// ----- Brute-force throttling (per key, e.g. "login:70123456") -----

export async function isThrottled(key: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`select locked_until > now() as locked from auth_throttle where key = ${key}`) as Array<{ locked: boolean | null }>;
  return Boolean(rows[0]?.locked);
}

export async function recordFailure(key: string, max = MAX_FAILED): Promise<void> {
  const sql = getSql();
  // Counter resets once a lock has expired, so a lock lasts LOCK_MINUTES.
  await sql`
    insert into auth_throttle (key, attempts, updated_at) values (${key}, 1, now())
    on conflict (key) do update set
      attempts = case when auth_throttle.locked_until is not null and auth_throttle.locked_until <= now() then 1 else auth_throttle.attempts + 1 end,
      locked_until = case
        when auth_throttle.locked_until is not null and auth_throttle.locked_until <= now() then null
        when auth_throttle.attempts + 1 >= ${max}::int then now() + make_interval(mins => ${LOCK_MINUTES}::int)
        else auth_throttle.locked_until end,
      updated_at = now()
  `;
}

export async function clearFailures(key: string): Promise<void> {
  const sql = getSql();
  await sql`delete from auth_throttle where key = ${key}`;
}

export const LOCKED_MESSAGE = `Too many attempts. Please wait ${LOCK_MINUTES} minutes and try again.`;

/** wa.me number for a canonical phone: "70123456" → "96170123456", "+44…" → "44…". */
export function waNumber(phone: string): string {
  if (phone.startsWith("+")) return phone.slice(1);
  return `961${phone.replace(/^0/, "")}`;
}

export function pinWhatsAppLink(phone: string, fullName: string, pin: string): string {
  const first = fullName.trim().split(/\s+/)[0] || "there";
  const text =
    `Hi ${first}, this is the Seasons by B sales team 🌸\n\n` +
    `Your Seasons by B account is ready. Log in at https://seasonsbyb.co.uk/account with your phone number and this PIN:\n\n` +
    `${pin}\n\n` +
    `You'll see all your orders there, plus your loyalty points and the rewards you can redeem. Please keep your PIN private.`;
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}
