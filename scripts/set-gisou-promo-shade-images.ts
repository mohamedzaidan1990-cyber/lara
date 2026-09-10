/**
 * Point the six individual Gisou Mix & Match rows at their own single-bottle
 * photo instead of the shared set photo — a customer seeing the 3-piece box
 * could think the promo price buys the whole set.
 *
 * Images were cropped from the user-supplied set photos (one bottle each),
 * trimmed and padded to 3:4, and saved to /public.
 *
 * Run:  npx ts-node scripts/set-gisou-promo-shade-images.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv(file: string): void {
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadDotenv(".env.local");
loadDotenv(".env");

import { getSql } from "../lib/db";

const IMAGES: Array<{ id: string; image: string }> = [
  { id: "8bd9871e-a3bf-405e-b168-704ffd197698", image: "/gisou-lip-oil-raspberry-swirl.jpg" },
  { id: "4e3afa47-bd5f-40eb-9ee1-e2844241d337", image: "/gisou-lip-oil-bee-llini-peach.jpg" },
  { id: "6bfe5abb-43d7-4693-bfe7-3c8ff692b741", image: "/gisou-lip-oil-glazed-plum.jpg" },
  { id: "77d5e642-ca1a-48ab-ada4-f00d73af58fe", image: "/gisou-hair-perfume-wildflower-honey.jpg" },
  { id: "a08f1d2e-95e9-43fa-ae8c-d6ae0051e6e4", image: "/gisou-hair-perfume-wild-rose.jpg" },
  { id: "dce6744e-53f8-4baa-98bf-275f2d623b36", image: "/gisou-hair-perfume-lavender-berry.jpg" }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();
  for (const { id, image } of IMAGES) {
    const rows = (await sql`
      update products
      set image_url = ${image}, images = ${JSON.stringify([image])}::jsonb, scraped_at = now()
      where id = ${id}
      returning name
    `) as Array<{ name: string }>;
    console.log(rows.length ? `OK  ${rows[0].name} -> ${image}` : `!! not found: ${id}`);
  }
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
