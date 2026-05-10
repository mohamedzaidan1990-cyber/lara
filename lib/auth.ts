import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

export function isAdmin(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === "true";
}

export function requireAdmin(): boolean {
  return isAdmin();
}
