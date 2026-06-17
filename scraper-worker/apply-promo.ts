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

// Double Serum ID already known from previous run
const DIRECT = [
  { id: "eaa31591-2b77-468b-a61e-410cc01c47f4", newPrice: 120, label: "Clarins Double Serum" },
];

const BY_NAME = [
  { pattern: "%super restorative night cream%50ml%",          newPrice: 160, label: "Super Restorative Night Cream 50ml" },
  { pattern: "%multi-active day cream%50ml%",                 newPrice: 100, label: "Multi-Active Day Cream 50ml", excludeSPF: true },
  { pattern: "%super restorative remodelling serum%50ml%",    newPrice: 190, label: "Super Restorative Remodelling Serum 50ml" },
  { pattern: "%extra-firming night cream%all skin%50ml%",     newPrice: 140, label: "Extra-Firming Night Cream All Skin 50ml" },
  { pattern: "%purifying toning lotion%200ml%",               newPrice: 50,  label: "Purifying Toning Lotion 200ml" },
  { pattern: "%skin illusion natural hydrating foundation%30ml%", newPrice: 60, label: "Skin Illusion Natural Hydrating Foundation 30ml" },
  { pattern: "%hydra-essentiel%night cream%50ml%",            newPrice: 70,  label: "Hydra-Essentiel Night Cream 50ml" },
  { pattern: "%total eye lift%15ml%",                         newPrice: 105, label: "Total Eye Lift 15ml" },
];

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  // Direct ID updates
  for (const { id, newPrice, label } of DIRECT) {
    const [row] = await sql`select name, price_usd from products where id = ${id}` as any[];
    if (!row) { console.log(`✗ [${label}] not found`); continue; }
    await sql`update products set price_usd = ${newPrice}, price_locked = true where id = ${id}`;
    console.log(`✓ [${label}] $${row.price_usd} → $${newPrice}`);
  }

  // Name-based updates
  for (const { pattern, newPrice, label, excludeSPF } of BY_NAME) {
    let rows = await sql`
      select id, name, price_usd from products
      where lower(brand) like '%clarins%'
        and lower(name) like ${pattern}
      order by name
    ` as any[];

    if (excludeSPF) rows = rows.filter((r: any) => !r.name.toLowerCase().includes("spf"));

    if (rows.length === 0) {
      console.log(`✗ [${label}] no match`);
    } else if (rows.length > 1) {
      console.log(`✗ [${label}] multiple matches:`);
      rows.forEach((r: any) => console.log(`   [${r.id}] ${r.name} $${r.price_usd}`));
    } else {
      await sql`update products set price_usd = ${newPrice}, price_locked = true where id = ${rows[0].id}`;
      console.log(`✓ [${label}] "${rows[0].name}" $${rows[0].price_usd} → $${newPrice}`);
    }
  }

  console.log("Done.");
})().catch(e => { console.error(e.message); process.exit(1); });
