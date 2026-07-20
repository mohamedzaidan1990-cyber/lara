import { getSql } from "./db";

// Public order counter for social proof. Counts every non-cancelled order and
// rounds DOWN to the nearest 10 so the site never over-claims ("100+" only
// once there really are 100). Returns 0 (callers hide the badge) below the
// display threshold or on any DB error — social proof must never break a page.
const DISPLAY_THRESHOLD = 30;

export async function getPublicOrderCount(): Promise<number> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select count(*)::int as n
      from orders
      where status is distinct from 'cancelled'
    `) as { n: number }[];
    const n = rows[0]?.n ?? 0;
    if (n < DISPLAY_THRESHOLD) return 0;
    return Math.floor(n / 10) * 10;
  } catch {
    return 0;
  }
}
