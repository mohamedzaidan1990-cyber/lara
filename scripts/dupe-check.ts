import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadDotenv(file: string): void {
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), file), "utf8"); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("="); if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(".env.local"); loadDotenv(".env");
import { getSql } from "../lib/db";

async function main() {
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  const max = maxArg ? Number(maxArg.slice(6)) : 9;
  const sql = getSql();
  const rows = (await sql`
    select min(brand) as brand, min(name) as name, count(*)::int c
    from products
    where not archived
    group by lower(trim(brand)), lower(trim(name))
    having count(*) > 1
    order by c desc, min(brand)
  `) as { brand: string; name: string; c: number }[];
  console.log(`exact duplicate (brand,name) groups: ${rows.length} (baseline ${max})`);
  for (const r of rows) console.log(`  [${r.c}x] ${r.brand} — ${r.name}`);
  if (rows.length > max) { console.error(`FAIL: ${rows.length} > ${max}`); process.exit(1); }
  console.log("OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
