import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function load(f: string): void {
  let text: string;
  try { text = readFileSync(f, "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}
load(resolve(__dirname, "..", ".env.local"));
load(resolve(__dirname, ".env"));

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  // Total Eye Lift 15ml (not the Refill)
  await sql`update products set price_usd = 105, price_locked = true where id = 'a6000668-c941-4683-9220-3165d5f5e676'`;
  console.log("✓ Total Eye Lift 15ml $98.80 → $105");
})().catch(e => { console.error(e.message); process.exit(1); });
