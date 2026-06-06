/**
 * One-off: crawl perfume + mist brand pages on Selfridges and upsert. Perfumes
 * and scented hair/body mists are auto-routed to the Fragrance category (20%).
 * Run: OXYLABS_USERNAME=.. OXYLABS_PASSWORD=.. npx tsx scrape-perfume-brands.ts
 */
import { readFileSync } from "node:fs"; import { resolve } from "node:path";
function load(f:string){let t:string;try{t=readFileSync(f,"utf8")}catch{return}for(const raw of t.split(/\r?\n/)){const l=raw.trim();if(!l||l.startsWith("#"))continue;const e=l.indexOf("=");if(e<0)continue;const k=l.slice(0,e).trim();if(!process.env[k])process.env[k]=l.slice(e+1).trim().replace(/^['"]|['"]$/g,"")}}
load(resolve(__dirname,"..",".env.local")); load(resolve(__dirname,".env"));

// Confirmed slugs (seen live) + user-requested + major houses + mist brands.
const BRANDS = [
  // confirmed live
  "byredo","diptyque","dior","guerlain","jo-malone-london","tom-ford","yves-saint-laurent","bvlgari","fragrance-du-bois","charlotte-tilbury",
  // user-requested
  "huda-beauty","kayali",
  // major perfume houses
  "maison-francis-kurkdjian","parfums-de-marly","creed","xerjoff","amouage","initio","nishane","juliette-has-a-gun","penhaligons","acqua-di-parma",
  "giorgio-armani","valentino-beauty","mugler","viktor-rolf","carolina-herrera","paco-rabanne","jean-paul-gaultier","marc-jacobs","versace","dolce-and-gabbana",
  "prada-beauty","burberry","gucci","lancome","narciso-rodriguez","mont-blanc","hermes","maison-margiela","le-labo","frederic-malle",
  "floral-street","escentric-molecules","ormonde-jayne","memo-paris","vilhelm-parfumerie",
  // mist-heavy brands (body / hair mists)
  "sol-de-janeiro","gisou","ouai","glossier","ariana-grande"
];

(async () => {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) { console.error("OXYLABS creds missing"); process.exit(1); }
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL missing"); process.exit(1); }
  const { scrapeSelfridgesBrands } = await import("./scraper");
  const { upsertProducts } = await import("./db");
  console.log(`Crawling ${BRANDS.length} perfume/mist brand pages…`);
  const rows = await scrapeSelfridgesBrands(BRANDS);
  const frag = rows.filter((r) => r.category === "Fragrance");
  const mists = frag.filter((r) => /\b(hair|body)\s*mist\b/i.test(r.name));
  console.log(`Scraped ${rows.length} products — ${frag.length} fragrance (${mists.length} hair/body mists).`);
  if (mists.length) console.log("Mists:\n" + mists.slice(0,10).map(m=>`  ${m.brand} ${m.name} — $${m.price_usd}`).join("\n"));
  if (rows.length) { const n = await upsertProducts(rows); console.log(`Upserted ${n}.`); }
})().catch((e) => { console.error("failed:", e?.message ?? e); process.exit(1); });
