/**
 * One-off import: 69 Tarte products sourced from Sephora Qatar screenshots.
 * Tarte is a new brand on the site — brands are derived entirely from the
 * `products` table (see lib/brands.ts), so no separate registration step
 * is needed beyond this insert.
 *
 * Pricing rule (per user instruction):
 *   price_usd = ceil(qar_price / 3.645 + 8)   (single items)
 *   price_usd = ceil(qar_price / 3.645 + 13)  (sets / kits / bundles / duos / trios)
 * Always rounded UP to the nearest whole dollar.
 *
 * 2 of the 72 cards seen across the 25 screenshots were exact duplicates
 * (scroll overlap) and were skipped: "Travel-Size Shape Tape Hydrating Full
 * Coverage Concealer" (QAR 65) and "BB Blur Tinted Moisturizer SPF 30"
 * (QAR 165, kept once).
 *
 * Images were not cropped from the screenshots. Most were sourced from
 * tartecosmetics.com's public Shopify catalog (products.json), matched by
 * exact product name/finish (travel-size, XL, waterproof, etc. all
 * distinguished) and spot-checked against the source screenshots. The 9
 * bundle/set items are Sephora-exclusive collabs not sold on tarte's own
 * site — their photos were pulled from the matching sephora.me regional
 * listing (found via web search, fetched with a Referer header) and
 * visually confirmed against the screenshots.
 *
 * price_gbp is a derived reference value (price_usd * 0.79) since the
 * source listing was in QAR, not GBP.
 *
 * Run:  npx ts-node scripts/add-tarte-products.ts
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

import { ensureSchema, getSql } from "../lib/db";

interface ProductSeed {
  brand: string;
  name: string;
  category: string;
  price_gbp: number;
  price_usd: number;
  product_url: string;
  image_url: string;
  deliverable_lebanon: boolean;
}

const PRODUCTS: ProductSeed[] = [
  { brand: "Tarte", name: "Shape Tape™ Blur Concealer Brush", category: "Beauty tools", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-blur-concealer-brush", image_url: "/tarte-shape-tape-blur-concealer-brush.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Tubing Liquid Eyeliner", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-tubing-liquid-eyeliner", image_url: "/tarte-tartelette-tubing-liquid-eyeliner.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "BB Blur Tinted Moisturizer SPF 30", category: "Makeup", price_gbp: 42.66, price_usd: 54, product_url: "https://www.sephora.qa/brand/tarte/#bb-blur-tinted-moisturizer-spf-30", image_url: "/tarte-bb-blur-tinted-moisturizer-spf-30.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Plump Shimmer Glass", category: "Makeup", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-plump-shimmer-glass", image_url: "/tarte-maracuja-juicy-lip-plump-shimmer-glass.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Hydrating Balm Gloss", category: "Makeup", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-hydrating-balm-gloss", image_url: "/tarte-maracuja-juicy-lip-hydrating-balm-gloss.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape Tape™ Hydrating Full Coverage Creamy Concealer", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-hydrating-full-coverage-creamy-concealer", image_url: "/tarte-shape-tape-hydrating-full-coverage-creamy-concealer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Shape Tape™ Full Coverage Matte Concealer", category: "Makeup", price_gbp: 20.54, price_usd: 26, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-shape-tape-full-coverage-matte-concealer", image_url: "/tarte-travel-size-shape-tape-full-coverage-matte-concealer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Sweet Delights Lip & Lash Set", category: "Makeup", price_gbp: 62.41, price_usd: 79, product_url: "https://www.sephora.qa/brand/tarte/#sweet-delights-lip-and-lash-set", image_url: "/tarte-sweet-delights-lip-and-lash-set.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape Tape™ Medium Coverage Radiant Concealer", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-medium-coverage-radiant-concealer", image_url: "/tarte-shape-tape-medium-coverage-radiant-concealer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Sculpt Tape™ Contour Liquid Bronzer", category: "Makeup", price_gbp: 36.34, price_usd: 46, product_url: "https://www.sephora.qa/brand/tarte/#sculpt-tape-contour-liquid-bronzer", image_url: "/tarte-sculpt-tape-contour-liquid-bronzer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Creaseless Full Coverage Radiant Concealer", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-creaseless-full-coverage-radiant-concealer", image_url: "/tarte-maracuja-creaseless-full-coverage-radiant-concealer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Lengthening & Tubing Mascara", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-lengthening-and-tubing-mascara", image_url: "/tarte-tartelette-lengthening-and-tubing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Join Our Click™ Maracuja Juicy Lip Trio", category: "Makeup", price_gbp: 36.34, price_usd: 46, product_url: "https://www.sephora.qa/brand/tarte/#join-our-click-maracuja-juicy-lip-trio", image_url: "/tarte-join-our-click-maracuja-juicy-lip-trio.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Quickie Foundation Blending Sponge", category: "Beauty tools", price_gbp: 21.33, price_usd: 27, product_url: "https://www.sephora.qa/brand/tarte/#quickie-foundation-blending-sponge", image_url: "/tarte-quickie-foundation-blending-sponge.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Smoldereyes™ 2-in-1 Eyeshadow & Eyeliner Stick", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#smoldereyes-2-in-1-eyeshadow-and-eyeliner-stick", image_url: "/tarte-smoldereyes-2-in-1-eyeshadow-and-eyeliner-stick.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ XL Lengthening & Tubing Mascara", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-xl-lengthening-and-tubing-mascara", image_url: "/tarte-tartelette-xl-lengthening-and-tubing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Liner", category: "Makeup", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-liner", image_url: "/tarte-maracuja-juicy-lip-liner.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Sculpt Tape™ Contour Liquid Bronzer", category: "Makeup", price_gbp: 25.28, price_usd: 32, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-sculpt-tape-contour-liquid-bronzer", image_url: "/tarte-travel-size-sculpt-tape-contour-liquid-bronzer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Plumping Peptide Gloss", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-plumping-peptide-gloss", image_url: "/tarte-maracuja-juicy-lip-plumping-peptide-gloss.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Quick Stick™ Waterproof Eyeliner", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-quick-stick-waterproof-eyeliner", image_url: "/tarte-tartelette-quick-stick-waterproof-eyeliner.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Prep, Set & Lock Setting Powder & Spray Duo", category: "Makeup", price_gbp: 36.34, price_usd: 46, product_url: "https://www.sephora.qa/brand/tarte/#prep-set-and-lock-setting-powder-and-spray-duo", image_url: "/tarte-prep-set-and-lock-setting-powder-and-spray-duo.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Plumping Lip Oil", category: "Makeup", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-plumping-lip-oil", image_url: "/tarte-maracuja-juicy-lip-plumping-lip-oil.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Lip Icons Maracuja Juicy Lip & Liner Duo", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#lip-icons-maracuja-juicy-lip-and-liner-duo", image_url: "/tarte-lip-icons-maracuja-juicy-lip-and-liner-duo.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Blush Tape™ Dewy Liquid Blush", category: "Makeup", price_gbp: 25.28, price_usd: 32, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-blush-tape-dewy-liquid-blush", image_url: "/tarte-travel-size-blush-tape-dewy-liquid-blush.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Ballin' Base™ Poreless Primer", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#ballin-base-poreless-primer", image_url: "/tarte-ballin-base-poreless-primer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Quickie Double-Ended Concealer Brush", category: "Beauty tools", price_gbp: 29.23, price_usd: 37, product_url: "https://www.sephora.qa/brand/tarte/#quickie-double-ended-concealer-brush", image_url: "/tarte-quickie-double-ended-concealer-brush.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maneater™ Lengthening & Volumizing Mascara", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#maneater-lengthening-and-volumizing-mascara", image_url: "/tarte-maneater-lengthening-and-volumizing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Glow Wardrobe Highlighting Eye & Cheek Palette", category: "Makeup", price_gbp: 41.08, price_usd: 52, product_url: "https://www.sephora.qa/brand/tarte/#glow-wardrobe-highlighting-eye-and-cheek-palette", image_url: "/tarte-glow-wardrobe-highlighting-eye-and-cheek-palette.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape Tape™ Full Coverage Hydrating Color Corrector", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-full-coverage-hydrating-color-corrector", image_url: "/tarte-shape-tape-full-coverage-hydrating-color-corrector.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Double Take Waterproof Liquid & Gel Pencil Eyeliner", category: "Makeup", price_gbp: 34.76, price_usd: 44, product_url: "https://www.sephora.qa/brand/tarte/#double-take-waterproof-liquid-and-gel-pencil-eyeliner", image_url: "/tarte-double-take-waterproof-liquid-and-gel-pencil-eyeliner.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Blush Tape™ Dewy Liquid Blush", category: "Makeup", price_gbp: 36.34, price_usd: 46, product_url: "https://www.sephora.qa/brand/tarte/#blush-tape-dewy-liquid-blush", image_url: "/tarte-blush-tape-dewy-liquid-blush.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Vinyl", category: "Makeup", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-vinyl", image_url: "/tarte-maracuja-juicy-lip-vinyl.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Go with the Faux Freckle Stamp", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#go-with-the-faux-freckle-stamp", image_url: "/tarte-go-with-the-faux-freckle-stamp.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Nourishing Melt Mask", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-nourishing-melt-mask", image_url: "/tarte-maracuja-juicy-lip-nourishing-melt-mask.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Amazonian Clay Toasted Warm Neutral Palette", category: "Makeup", price_gbp: 52.14, price_usd: 66, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-amazonian-clay-toasted-warm-neutral-palette", image_url: "/tarte-tartelette-amazonian-clay-toasted-warm-neutral-palette.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maneater™ Blush & Glow™ Liquid Blush Cheek Plump", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#maneater-blush-and-glow-liquid-blush-cheek-plump", image_url: "/tarte-maneater-blush-and-glow-liquid-blush-cheek-plump.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Macaron Sculpt & Bronze Duo", category: "Makeup", price_gbp: 44.24, price_usd: 56, product_url: "https://www.sephora.qa/brand/tarte/#macaron-sculpt-and-bronze-duo", image_url: "/tarte-macaron-sculpt-and-bronze-duo.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Amazonian Clay in Bloom Neutral Eyeshadow Palette", category: "Makeup", price_gbp: 52.14, price_usd: 66, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-amazonian-clay-in-bloom-neutral-eyeshadow-palette", image_url: "/tarte-tartelette-amazonian-clay-in-bloom-neutral-eyeshadow-palette.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Amazonian Clay Super Slim Waterproof Brow Definer", category: "Makeup", price_gbp: 32.39, price_usd: 41, product_url: "https://www.sephora.qa/brand/tarte/#amazonian-clay-super-slim-waterproof-brow-definer", image_url: "/tarte-amazonian-clay-super-slim-waterproof-brow-definer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Multi-Stick Cream Blush Stick & Lip Tint", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-multi-stick-cream-blush-stick-and-lip-tint", image_url: "/tarte-maracuja-multi-stick-cream-blush-stick-and-lip-tint.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Brows for Days™ Framing Eyebrow Gel", category: "Makeup", price_gbp: 27.65, price_usd: 35, product_url: "https://www.sephora.qa/brand/tarte/#brows-for-days-framing-eyebrow-gel", image_url: "/tarte-brows-for-days-framing-eyebrow-gel.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Fake Awake™ Waterproof Gel Eyeliner Highlight", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#fake-awake-waterproof-gel-eyeliner-highlight", image_url: "/tarte-fake-awake-waterproof-gel-eyeliner-highlight.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Life Lock™ Hydrating Waterproof Setting Spray", category: "Makeup", price_gbp: 36.34, price_usd: 46, product_url: "https://www.sephora.qa/brand/tarte/#life-lock-hydrating-waterproof-setting-spray", image_url: "/tarte-life-lock-hydrating-waterproof-setting-spray.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "The Award Winners Best-Sellers Set", category: "Makeup", price_gbp: 41.08, price_usd: 52, product_url: "https://www.sephora.qa/brand/tarte/#the-award-winners-best-sellers-set", image_url: "/tarte-the-award-winners-best-sellers-set.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Amazonian Clay Matte Cool-Toned Palette", category: "Makeup", price_gbp: 52.14, price_usd: 66, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-amazonian-clay-matte-cool-toned-palette", image_url: "/tarte-tartelette-amazonian-clay-matte-cool-toned-palette.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Tartelette™ XL Lengthening & Tubing Mascara", category: "Makeup", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-tartelette-xl-lengthening-and-tubing-mascara", image_url: "/tarte-travel-size-tartelette-xl-lengthening-and-tubing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Lights, Camera, Lashes™ 4-in-1 Volumizing Mascara", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#lights-camera-lashes-4-in-1-volumizing-mascara", image_url: "/tarte-lights-camera-lashes-4-in-1-volumizing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "#Trippinwithtarte Amazonian Clay Eyeshadow Palette", category: "Makeup", price_gbp: 52.14, price_usd: 66, product_url: "https://www.sephora.qa/brand/tarte/#trippinwithtarte-amazonian-clay-eyeshadow-palette", image_url: "/tarte-trippinwithtarte-amazonian-clay-eyeshadow-palette.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Blush Tape™ Satin Liquid Blush", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#blush-tape-satin-liquid-blush", image_url: "/tarte-blush-tape-satin-liquid-blush.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Lights, Camera, Lashes™ 4-in-1 Volumizing & Lengthening Platinum Mascara", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#lights-camera-lashes-4-in-1-volumizing-and-lengthening-platinum-mascara", image_url: "/tarte-lights-camera-lashes-4-in-1-volumizing-and-lengthening-platinum-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Maneater™ Lengthening & Volumizing Mascara", category: "Makeup", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-maneater-lengthening-and-volumizing-mascara", image_url: "/tarte-travel-size-maneater-lengthening-and-volumizing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Tartelette™ Tubing Lash Primer", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#tartelette-tubing-lash-primer", image_url: "/tarte-tartelette-tubing-lash-primer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Key Largo Glow Serum Bronzing Drops", category: "Makeup", price_gbp: 39.5, price_usd: 50, product_url: "https://www.sephora.qa/brand/tarte/#key-largo-glow-serum-bronzing-drops", image_url: "/tarte-key-largo-glow-serum-bronzing-drops.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maneater™ Waterproof Lengthening & Volumizing Mascara", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#maneater-waterproof-lengthening-and-volumizing-mascara", image_url: "/tarte-maneater-waterproof-lengthening-and-volumizing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Maracuja Juicy Lip Hydrating Balm Gloss", category: "Makeup", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-maracuja-juicy-lip-hydrating-balm-gloss", image_url: "/tarte-travel-size-maracuja-juicy-lip-hydrating-balm-gloss.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Travel-Size Tartelette™ Lengthening & Tubing Mascara", category: "Makeup", price_gbp: 22.12, price_usd: 28, product_url: "https://www.sephora.qa/brand/tarte/#travel-size-tartelette-lengthening-and-tubing-mascara", image_url: "/tarte-travel-size-tartelette-lengthening-and-tubing-mascara.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape Tape™ Full Coverage Matte Concealer", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-full-coverage-matte-concealer", image_url: "/tarte-shape-tape-full-coverage-matte-concealer.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Face Tape™ Full-Coverage Liquid Foundation", category: "Makeup", price_gbp: 45.03, price_usd: 57, product_url: "https://www.sephora.qa/brand/tarte/#face-tape-full-coverage-liquid-foundation", image_url: "/tarte-face-tape-full-coverage-liquid-foundation.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape Tape™ Blurring Concealer Stick", category: "Makeup", price_gbp: 33.97, price_usd: 43, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-blurring-concealer-stick", image_url: "/tarte-shape-tape-blurring-concealer-stick.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Creaseless Loose Setting & Brightening Powder", category: "Makeup", price_gbp: 41.08, price_usd: 52, product_url: "https://www.sephora.qa/brand/tarte/#creaseless-loose-setting-and-brightening-powder", image_url: "/tarte-creaseless-loose-setting-and-brightening-powder.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Macaron Blush & Glow™ Duo", category: "Makeup", price_gbp: 44.24, price_usd: 56, product_url: "https://www.sephora.qa/brand/tarte/#macaron-blush-and-glow-duo", image_url: "/tarte-macaron-blush-and-glow-duo.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Amazonian Clay 16-Hr Blurring Powder Foundation", category: "Makeup", price_gbp: 45.03, price_usd: 57, product_url: "https://www.sephora.qa/brand/tarte/#amazonian-clay-16-hr-blurring-powder-foundation", image_url: "/tarte-amazonian-clay-16-hr-blurring-powder-foundation.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape & Set Bonus Duo", category: "Makeup", price_gbp: 52.14, price_usd: 66, product_url: "https://www.sephora.qa/brand/tarte/#shape-and-set-bonus-duo", image_url: "/tarte-shape-and-set-bonus-duo.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Hydrating Plump Gloss", category: "Makeup", price_gbp: 30.81, price_usd: 39, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-hydrating-plump-gloss", image_url: "/tarte-maracuja-juicy-lip-hydrating-plump-gloss.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Amazonian Clay 12-Hour Powder Blush", category: "Makeup", price_gbp: 37.13, price_usd: 47, product_url: "https://www.sephora.qa/brand/tarte/#amazonian-clay-12-hour-powder-blush", image_url: "/tarte-amazonian-clay-12-hour-powder-blush.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Maracuja Juicy Lip Plump Peptide Liner", category: "Makeup", price_gbp: 31.6, price_usd: 40, product_url: "https://www.sephora.qa/brand/tarte/#maracuja-juicy-lip-plump-peptide-liner", image_url: "/tarte-maracuja-juicy-lip-plump-peptide-liner.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "CC Full Coverage Undereye Color Corrector", category: "Makeup", price_gbp: 28.44, price_usd: 36, product_url: "https://www.sephora.qa/brand/tarte/#cc-full-coverage-undereye-color-corrector", image_url: "/tarte-cc-full-coverage-undereye-color-corrector.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Shape Tape™ Concealer Bonus Set", category: "Makeup", price_gbp: 52.14, price_usd: 66, product_url: "https://www.sephora.qa/brand/tarte/#shape-tape-concealer-bonus-set", image_url: "/tarte-shape-tape-concealer-bonus-set.jpg", deliverable_lebanon: true },
  { brand: "Tarte", name: "Glow Tape™ Luminous Liquid Highlighter", category: "Makeup", price_gbp: 36.34, price_usd: 46, product_url: "https://www.sephora.qa/brand/tarte/#glow-tape-luminous-liquid-highlighter", image_url: "/tarte-glow-tape-luminous-liquid-highlighter.jpg", deliverable_lebanon: true }
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Make sure .env.local exists in the project root.");
    process.exit(1);
  }

  await ensureSchema();
  const sql = getSql();

  let inserted = 0;
  for (const p of PRODUCTS) {
    try {
      await sql`
        insert into products (
          brand, name, category, price_gbp, price_usd, deliverable_lebanon, product_url, image_url
        )
        values (
          ${p.brand}, ${p.name}, ${p.category}, ${p.price_gbp}, ${p.price_usd},
          ${p.deliverable_lebanon}, ${p.product_url}, ${p.image_url}
        )
        on conflict (product_url) do update set
          brand = excluded.brand,
          name = excluded.name,
          category = excluded.category,
          price_gbp = excluded.price_gbp,
          price_usd = excluded.price_usd,
          deliverable_lebanon = excluded.deliverable_lebanon,
          image_url = excluded.image_url,
          scraped_at = now()
      `;
      inserted += 1;
      console.log(`  OK  ${p.name} — $${p.price_usd}`);
    } catch (err) {
      console.error(`FAIL  ${p.name}:`, err);
    }
  }

  console.log(`\nInserted/updated ${inserted}/${PRODUCTS.length} Tarte products.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
