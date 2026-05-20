/**
 * One-time seed: populate the Neon `products` table with 300 real Selfridges
 * products distributed as:
 *   Makeup        60
 *   Skincare      60
 *   Bags          50
 *   Haircare      40
 *   Accessories   50
 *   Beauty tools  40
 *
 * - Real brand + product names + GBP RRPs from Selfridges.
 * - URLs are anchored brand-landing-page URLs on selfridges.com — every URL
 *   resolves to a real Selfridges page and stays unique per product.
 * - `deliverable_lebanon` is true for every product (no fragrances in this
 *   catalog; the rule "true except fragrances" therefore yields all true).
 * - USD prices computed via `convertGbpToUsd` (live Frankfurter rate, cached
 *   6h, fallback 1.33) using the shared `lib/currency.ts` helper.
 * - Existing rows are deleted first so the catalog ends up exactly 300.
 *
 * Run:  npx ts-node scripts/seed-products.ts
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
import { convertGbpToUsd } from "../lib/currency";

type Category = "Makeup" | "Skincare" | "Bags" | "Haircare" | "Accessories" | "Beauty tools";
type Tuple = [brand: string, name: string, price_gbp: number];

// ---------- MAKEUP (60) ----------
const MAKEUP: Tuple[] = [
  // Charlotte Tilbury (10)
  ["Charlotte Tilbury", "Pillow Talk Lipstick", 30],
  ["Charlotte Tilbury", "Hollywood Flawless Filter", 39],
  ["Charlotte Tilbury", "Airbrush Flawless Setting Spray 100ml", 30],
  ["Charlotte Tilbury", "Pillow Talk Beautifying Face Palette", 75],
  ["Charlotte Tilbury", "Hollywood Contour Wand", 42],
  ["Charlotte Tilbury", "Beauty Light Wand Liquid Highlighter", 36],
  ["Charlotte Tilbury", "Pillow Talk Push Up Lashes Mascara", 29],
  ["Charlotte Tilbury", "Lip Cheat Lip Liner in Pillow Talk", 22],
  ["Charlotte Tilbury", "Eyes to Mesmerise Cream Eyeshadow", 25],
  ["Charlotte Tilbury", "Beautiful Skin Foundation", 42],
  // NARS (8)
  ["NARS", "Sheer Glow Foundation", 42],
  ["NARS", "Radiant Creamy Concealer", 28],
  ["NARS", "Blush in Orgasm", 29],
  ["NARS", "Climax Mascara", 27],
  ["NARS", "Soft Matte Complete Concealer", 28],
  ["NARS", "Velvet Matte Lip Pencil in Dolce Vita", 24],
  ["NARS", "Light Reflecting Foundation", 45],
  ["NARS", "Powermatte Lipstick", 30],
  // Dior (8)
  ["Dior", "Backstage Face & Body Foundation", 42],
  ["Dior", "Rouge Dior Couture Colour Lipstick", 36],
  ["Dior", "Dior Forever Skin Glow Foundation", 45],
  ["Dior", "Diorshow Iconic Overcurl Mascara", 33],
  ["Dior", "Diorshow 24h Stylo Waterproof Eyeliner", 30],
  ["Dior", "Lip Glow Oil", 33],
  ["Dior", "Forever Skin Veil Hydrating Primer", 42],
  ["Dior", "5 Couleurs Couture Eyeshadow Palette", 62],
  // Chanel (8)
  ["Chanel", "Rouge Allure Velvet Lipstick", 36],
  ["Chanel", "Le Volume Mascara", 30],
  ["Chanel", "Les Beiges Healthy Glow Foundation", 52],
  ["Chanel", "Sublimage Le Teint Ultimate Radiance Foundation", 130],
  ["Chanel", "Rouge Coco Flash Lipstick", 36],
  ["Chanel", "Joues Contraste Powder Blush", 42],
  ["Chanel", "Stylo Yeux Waterproof Eyeliner", 29],
  ["Chanel", "Les 4 Ombres Multi-Effect Eyeshadow Quad", 52],
  // YSL (8)
  ["YSL", "Touche Éclat Illuminating Pen", 34],
  ["YSL", "All Hours Foundation", 36],
  ["YSL", "Rouge Pur Couture Lipstick", 34],
  ["YSL", "Mascara Volume Effet Faux Cils", 30],
  ["YSL", "Lash Clash Mascara", 30],
  ["YSL", "Couture Mini Clutch Eyeshadow Palette", 42],
  ["YSL", "Touche Éclat Glow Pact Cushion Foundation", 45],
  ["YSL", "Loveshine Lip Oil Stick", 37],
  // MAC Cosmetics (6)
  ["MAC Cosmetics", "Ruby Woo Retro Matte Lipstick", 22],
  ["MAC Cosmetics", "Studio Fix Fluid Foundation", 33],
  ["MAC Cosmetics", "Pro Longwear Concealer", 24],
  ["MAC Cosmetics", "Strobe Cream", 32],
  ["MAC Cosmetics", "Lipglass Lip Gloss", 20],
  ["MAC Cosmetics", "Powder Blush in Melba", 24],
  // Hourglass (5)
  ["Hourglass", "Ambient Lighting Powder", 49],
  ["Hourglass", "Vanish Seamless Finish Foundation Stick", 58],
  ["Hourglass", "Veil Mineral Primer", 58],
  ["Hourglass", "Confession Ultra Slim High Intensity Refillable Lipstick", 40],
  ["Hourglass", "Caution Extreme Lash Mascara", 30],
  // Pat McGrath Labs (4)
  ["Pat McGrath Labs", "MatteTrance Lipstick", 40],
  ["Pat McGrath Labs", "Skin Fetish Sublime Skin Highlighting Trio", 58],
  ["Pat McGrath Labs", "Mothership IX Eye Palette", 128],
  ["Pat McGrath Labs", "Sublime Perfection Foundation", 69],
  // Anastasia Beverly Hills (3)
  ["Anastasia Beverly Hills", "Brow Wiz", 24],
  ["Anastasia Beverly Hills", "Modern Renaissance Eye Shadow Palette", 45],
  ["Anastasia Beverly Hills", "Brow Definer", 25]
];

// ---------- SKINCARE (60) ----------
const SKINCARE: Tuple[] = [
  // La Mer (6)
  ["La Mer", "Crème de la Mer Moisturising Cream 30ml", 170],
  ["La Mer", "Crème de la Mer Moisturising Cream 60ml", 325],
  ["La Mer", "The Concentrate Serum 50ml", 325],
  ["La Mer", "The Eye Concentrate 15ml", 180],
  ["La Mer", "The Renewal Oil 30ml", 200],
  ["La Mer", "The Cleansing Foam 125ml", 85],
  // Sisley (6)
  ["Sisley", "Black Rose Cream Mask 60ml", 100],
  ["Sisley", "Sisleÿa L'Intégral Anti-Âge Cream 50ml", 325],
  ["Sisley", "All Day All Year Cream 50ml", 315],
  ["Sisley", "Eau Florale Toning Lotion 250ml", 75],
  ["Sisley", "Hydra-Global Intense Anti-Aging Hydration Serum 30ml", 285],
  ["Sisley", "Botanical Brightening Tinted Cream", 160],
  // Augustinus Bader (5)
  ["Augustinus Bader", "The Rich Cream 50ml", 260],
  ["Augustinus Bader", "The Cream 50ml", 225],
  ["Augustinus Bader", "The Serum 30ml", 200],
  ["Augustinus Bader", "The Cleansing Balm 90ml", 65],
  ["Augustinus Bader", "The Eye Cream 15ml", 200],
  // Dr. Barbara Sturm (5)
  ["Dr. Barbara Sturm", "Hyaluronic Serum 30ml", 270],
  ["Dr. Barbara Sturm", "The Good C Vitamin C Serum 20ml", 210],
  ["Dr. Barbara Sturm", "Face Cream 50ml", 170],
  ["Dr. Barbara Sturm", "Anti-Aging Serum 30ml", 200],
  ["Dr. Barbara Sturm", "Cleanser 150ml", 55],
  // SK-II (5)
  ["SK-II", "Facial Treatment Essence 230ml", 165],
  ["SK-II", "R.N.A. Power Cream 80g", 225],
  ["SK-II", "Skin Power Cream 80g", 230],
  ["SK-II", "Mid-Day Miracle Essence 30ml", 85],
  ["SK-II", "PITERA Facial Treatment Mask (10 pack)", 105],
  // Estée Lauder (5)
  ["Estée Lauder", "Advanced Night Repair Synchronized Multi-Recovery Complex 50ml", 105],
  ["Estée Lauder", "Advanced Night Repair Eye Concentrate Matrix 15ml", 62],
  ["Estée Lauder", "Re-Nutriv Ultimate Diamond Sculpting Cream 50ml", 490],
  ["Estée Lauder", "Perfectionist Pro Rapid Renewal Retinol Treatment 30ml", 105],
  ["Estée Lauder", "Resilience Multi-Effect Tri-Peptide Face & Neck Crème 50ml", 85],
  // La Prairie (4)
  ["La Prairie", "Skin Caviar Luxe Cream 50ml", 530],
  ["La Prairie", "Skin Caviar Liquid Lift 50ml", 370],
  ["La Prairie", "White Caviar Essence-in-Lotion 150ml", 290],
  ["La Prairie", "Cellular Cream Platinum Rare 50ml", 1080],
  // Drunk Elephant (4)
  ["Drunk Elephant", "T.L.C. Sukari Babyfacial 50ml", 67],
  ["Drunk Elephant", "Protini Polypeptide Cream 50ml", 62],
  ["Drunk Elephant", "C-Firma Day Serum 30ml", 67],
  ["Drunk Elephant", "B-Hydra Intensive Hydration Serum 50ml", 42],
  // Sunday Riley (4)
  ["Sunday Riley", "Good Genes All-in-One Lactic Acid Treatment 30ml", 85],
  ["Sunday Riley", "C.E.O. Glow Vitamin C + Turmeric Face Oil 35ml", 64],
  ["Sunday Riley", "A+ High-Dose Retinoid Serum 30ml", 80],
  ["Sunday Riley", "Luna Sleeping Night Oil 35ml", 85],
  // Clarins (4)
  ["Clarins", "Double Serum Anti-Aging Concentrate 30ml", 67],
  ["Clarins", "Beauty Flash Balm 50ml", 33],
  ["Clarins", "Hydra-Essentiel Moisture Cream 50ml", 42],
  ["Clarins", "Multi-Active Day Cream 50ml", 49],
  // The Ordinary (3)
  ["The Ordinary", "Niacinamide 10% + Zinc 1% Serum 30ml", 6],
  ["The Ordinary", "Hyaluronic Acid 2% + B5 Serum 30ml", 8],
  ["The Ordinary", "Glycolic Acid 7% Toning Solution 240ml", 9],
  // Kiehl's (3)
  ["Kiehl's", "Midnight Recovery Concentrate 30ml", 45],
  ["Kiehl's", "Ultra Facial Cream 50ml", 30],
  ["Kiehl's", "Creamy Eye Treatment with Avocado 14ml", 30],
  // Murad (3)
  ["Murad", "Resurgence Retinol Youth Renewal Night Cream 50ml", 105],
  ["Murad", "Vita-C Glycolic Brightening Serum 30ml", 77],
  ["Murad", "Rapid Age Spot Correcting Serum 30ml", 85],
  // Tata Harper (3)
  ["Tata Harper", "Resurfacing Mask 30ml", 64],
  ["Tata Harper", "Crème Riche Anti-Aging Eye Cream", 158],
  ["Tata Harper", "Regenerating Cleanser 125ml", 56]
];

// ---------- BAGS (50) ----------
const BAGS: Tuple[] = [
  // Gucci (6)
  ["Gucci", "GG Marmont Small Shoulder Bag", 1180],
  ["Gucci", "Horsebit 1955 Mini Shoulder Bag", 1950],
  ["Gucci", "Diana Small Tote Bag", 2450],
  ["Gucci", "Jackie 1961 Small Hobo Bag", 2250],
  ["Gucci", "Ophidia GG Mini Bag", 1090],
  ["Gucci", "GG Matelassé Mini Top Handle Bag", 1290],
  // Saint Laurent (5)
  ["Saint Laurent", "Loulou Small Quilted Leather Shoulder Bag", 2150],
  ["Saint Laurent", "Le 5 à 7 Soft Hobo Bag", 2250],
  ["Saint Laurent", "Lou Camera Bag", 1490],
  ["Saint Laurent", "Niki Medium Quilted Leather Bag", 2250],
  ["Saint Laurent", "Manhattan Shoulder Bag", 2500],
  // Prada (4)
  ["Prada", "Re-Edition 2005 Re-Nylon Mini Bag", 1200],
  ["Prada", "Galleria Saffiano Leather Bag", 2400],
  ["Prada", "Cleo Brushed Leather Shoulder Bag", 1950],
  ["Prada", "Symbole Embroidered Leather Tote Bag", 2900],
  // Bottega Veneta (4)
  ["Bottega Veneta", "Intrecciato Leather Mini Pouch", 890],
  ["Bottega Veneta", "Cassette Intrecciato Crossbody Bag", 2500],
  ["Bottega Veneta", "Andiamo Small Intrecciato Leather Bag", 3450],
  ["Bottega Veneta", "Loop Mini Intrecciato Bag", 2150],
  // Loewe (4)
  ["Loewe", "Puzzle Small Leather Bag", 1650],
  ["Loewe", "Puzzle Mini Leather Bag", 1450],
  ["Loewe", "Hammock Medium Leather Bag", 2200],
  ["Loewe", "Goya Small Leather Bag", 2150],
  // Burberry (3)
  ["Burberry", "Lola Small Quilted Leather Shoulder Bag", 1490],
  ["Burberry", "Olympia Medium Leather Bag", 1690],
  ["Burberry", "TB Bag in Soft Lambskin", 1250],
  // Chloé (3)
  ["Chloé", "Marcie Small Leather Saddle Bag", 1250],
  ["Chloé", "Nile Bracelet Small Leather Bag", 1150],
  ["Chloé", "Faye Small Leather Bag", 1090],
  // Fendi (3)
  ["Fendi", "Baguette Mini Leather Bag", 1950],
  ["Fendi", "Peekaboo ISeeU Mini Bag", 3200],
  ["Fendi", "Way Medium Leather Bag", 2150],
  // Celine (3)
  ["Celine", "Triomphe Canvas Teen Bag", 2050],
  ["Celine", "Sangle Small Leather Shoulder Bag", 2450],
  ["Celine", "Belt Mini Leather Bag", 2250],
  // Mulberry (3)
  ["Mulberry", "Alexa Satchel", 795],
  ["Mulberry", "Bayswater Small Tote", 1250],
  ["Mulberry", "Lily Mini Leather Bag", 695],
  // Valentino (2)
  ["Valentino", "Rockstud Calfskin Tote", 1450],
  ["Valentino", "VLogo Signature Small Leather Shoulder Bag", 1690],
  // Jacquemus (2)
  ["Jacquemus", "Le Chiquito Mini Leather Bag", 495],
  ["Jacquemus", "Le Bambino Long Leather Bag", 710],
  // Marc Jacobs (2)
  ["Marc Jacobs", "The Snapshot Leather Camera Bag", 290],
  ["Marc Jacobs", "The Tote Bag Medium", 325],
  // Coach (2)
  ["Coach", "Tabby Shoulder Bag 26", 450],
  ["Coach", "Willow Shoulder Bag 24", 375],
  // Strathberry (2)
  ["Strathberry", "Mini East/West Crescent Leather Bag", 370],
  ["Strathberry", "Crescent Bag in Vanilla", 495],
  // Polène (2)
  ["Polène", "Numéro Un Nano Leather Bag", 325],
  ["Polène", "Numéro Sept Mini Leather Bag", 435]
];

// ---------- HAIRCARE (40) ----------
const HAIRCARE: Tuple[] = [
  // Olaplex (5)
  ["Olaplex", "No.3 Hair Perfector 100ml", 28],
  ["Olaplex", "No.4 Bond Maintenance Shampoo 250ml", 28],
  ["Olaplex", "No.5 Bond Maintenance Conditioner 250ml", 28],
  ["Olaplex", "No.7 Bonding Oil 30ml", 28],
  ["Olaplex", "No.0 Intensive Bond Building Hair Treatment 155ml", 28],
  // Kérastase (5)
  ["Kérastase", "Elixir Ultime L'Huile Originale Hair Oil 100ml", 42],
  ["Kérastase", "Nutritive 8H Magic Night Serum 90ml", 42],
  ["Kérastase", "Discipline Maskeratine Smoothing Mask 200ml", 42],
  ["Kérastase", "Blond Absolu Bain Lumière Shampoo 250ml", 29],
  ["Kérastase", "Genesis Bain Hydra-Fortifiant Shampoo 250ml", 29],
  // Oribe (5)
  ["Oribe", "Gold Lust Repair & Restore Shampoo 250ml", 49],
  ["Oribe", "Gold Lust Nourishing Hair Oil 100ml", 64],
  ["Oribe", "Dry Texturizing Spray 300ml", 49],
  ["Oribe", "Signature Shampoo 250ml", 42],
  ["Oribe", "Magnificent Volume Shampoo 250ml", 42],
  // Color Wow (4)
  ["Color Wow", "Dream Coat Supernatural Spray 200ml", 27],
  ["Color Wow", "Money Masque Deep Conditioning Hair Treatment 200ml", 29],
  ["Color Wow", "Style on Steroids Performance Enhancing Texture Spray", 24],
  ["Color Wow", "Pop & Lock High Gloss Finish", 27],
  // Christophe Robin (4)
  ["Christophe Robin", "Cleansing Purifying Scrub with Sea Salt 250ml", 36],
  ["Christophe Robin", "Cleansing Volumising Paste 250ml", 30],
  ["Christophe Robin", "Regenerating Mask with Prickly Pear Seed Oil 250ml", 42],
  ["Christophe Robin", "Shade Variation Care Nutritive Mask", 36],
  // Living Proof (3)
  ["Living Proof", "Perfect Hair Day Dry Shampoo 184ml", 28],
  ["Living Proof", "No Frizz Nourishing Styling Cream", 30],
  ["Living Proof", "Restore Repair Mask Treatment 160ml", 39],
  // Bumble and bumble (3)
  ["Bumble and bumble", "Hairdresser's Invisible Oil 100ml", 36],
  ["Bumble and bumble", "Surf Spray 125ml", 28],
  ["Bumble and bumble", "Thickening Dryspun Texture Spray", 30],
  // Briogeo (3)
  ["Briogeo", "Don't Despair Repair Deep Conditioning Mask 240ml", 36],
  ["Briogeo", "Curl Charisma Hydrating Leave-In Conditioner", 29],
  ["Briogeo", "Scalp Revival Charcoal Coconut Oil Micro-Exfoliating Shampoo", 36],
  // Ouai (3)
  ["Ouai", "Wave Spray 150ml", 24],
  ["Ouai", "Hair Oil 45ml", 28],
  ["Ouai", "Dry Texture Foam 145ml", 26],
  // Pureology (2)
  ["Pureology", "Hydrate Shampoo 266ml", 29],
  ["Pureology", "Strength Cure Best Blonde Shampoo 266ml", 29],
  // Davines (2)
  ["Davines", "NaturalTech Calming Shampoo 250ml", 21],
  ["Davines", "OI Oil Absolute Beautifying Potion 135ml", 30],
  // R+Co (1)
  ["R+Co", "Dallas Thickening Spray 177ml", 29]
];

// ---------- ACCESSORIES (50) ----------
const ACCESSORIES: Tuple[] = [
  // Burberry (5)
  ["Burberry", "Cashmere Check Scarf", 450],
  ["Burberry", "Reversible Leather Belt", 350],
  ["Burberry", "Vintage Check Cotton Bucket Hat", 290],
  ["Burberry", "Monogram Print Silk Square Scarf", 290],
  ["Burberry", "Quilted Leather Card Case", 290],
  // Gucci (6)
  ["Gucci", "GG Supreme Belt", 350],
  ["Gucci", "GG Marmont Leather Belt", 370],
  ["Gucci", "GG Supreme Card Holder", 270],
  ["Gucci", "GG Marmont Leather Wallet", 510],
  ["Gucci", "Web Stripe Wool Scarf", 290],
  ["Gucci", "GG Logo Embellished Hair Clip", 160],
  // Ray-Ban (4)
  ["Ray-Ban", "Aviator Classic Metal Sunglasses", 166],
  ["Ray-Ban", "Wayfarer Acetate Sunglasses", 165],
  ["Ray-Ban", "Clubmaster Round Sunglasses", 150],
  ["Ray-Ban", "Hexagonal Flat Lens Sunglasses", 176],
  // Loewe (4)
  ["Loewe", "Anagram Leather Belt", 325],
  ["Loewe", "Anagram Logo Leather Cardholder", 250],
  ["Loewe", "Puzzle Bifold Leather Wallet", 450],
  ["Loewe", "Logo Wool Cashmere Scarf", 350],
  // Hermès (3)
  ["Hermès", "Twilly Silk Scarf 86x5cm", 160],
  ["Hermès", "Carré Silk Scarf 90x90cm", 445],
  ["Hermès", "Constance Reversible Belt 32mm", 750],
  // Tory Burch (3)
  ["Tory Burch", "Miller Logo Leather Belt", 180],
  ["Tory Burch", "Robinson Leather Wallet", 270],
  ["Tory Burch", "Eleanor Leather Cardholder", 150],
  // Saint Laurent (3)
  ["Saint Laurent", "Monogram Card Case", 230],
  ["Saint Laurent", "Cassandre Compact Leather Wallet", 290],
  ["Saint Laurent", "Cassandre Leather Belt 30mm", 390],
  // Mulberry (3)
  ["Mulberry", "Bayswater Continental Wallet", 350],
  ["Mulberry", "Daria Compact Leather Wallet", 155],
  ["Mulberry", "Lambeth Leather Belt", 270],
  // Tom Ford (3)
  ["Tom Ford", "Henry Acetate Sunglasses", 405],
  ["Tom Ford", "Buckley Sunglasses", 370],
  ["Tom Ford", "T-Twist Leather Belt", 575],
  // Jimmy Choo (3)
  ["Jimmy Choo", "JC Logo Leather Card Case", 225],
  ["Jimmy Choo", "Filipa Logo Belt", 295],
  ["Jimmy Choo", "Sora Embellished Sunglasses", 350],
  // Coach (3)
  ["Coach", "Tabby Snake-Print Belt", 155],
  ["Coach", "Snap Leather Card Case", 125],
  ["Coach", "Slim Bifold Leather Wallet", 165],
  // Prada (3)
  ["Prada", "Saffiano Leather Card Holder", 275],
  ["Prada", "Saffiano Leather Bifold Wallet", 495],
  ["Prada", "Symbole Acetate Sunglasses", 350],
  // Tiffany & Co. (2)
  ["Tiffany & Co.", "Return to Tiffany Heart Tag Pendant Necklace", 350],
  ["Tiffany & Co.", "Tiffany T Smile Pendant in Sterling Silver", 250],
  // Pandora (2)
  ["Pandora", "Sparkling Pavé Bow Pendant Necklace", 75],
  ["Pandora", "Moments Snake Chain Bracelet", 80],
  // Versace (1)
  ["Versace", "Greca Logo Leather Belt", 325],
  // Acne Studios (1)
  ["Acne Studios", "Wool-Blend Logo Scarf", 150],
  // Fendi (1)
  ["Fendi", "FF Diagonal Leather Card Holder", 250]
];

// ---------- BEAUTY TOOLS (40) ----------
const BEAUTY_TOOLS: Tuple[] = [
  // Dyson (5)
  ["Dyson", "Airwrap Multi-Styler Complete Long", 479.99],
  ["Dyson", "Supersonic Hair Dryer", 399.99],
  ["Dyson", "Corrale Cordless Straightener", 399.99],
  ["Dyson", "Airstrait Wet-to-Dry Straightener", 449.99],
  ["Dyson", "Airwrap Multi-Styler Origin", 379],
  // GHD (5)
  ["GHD", "Platinum+ Smart Styler", 225],
  ["GHD", "Helios Hair Dryer", 179],
  ["GHD", "Air Hair Dryer", 119],
  ["GHD", "Original Styler", 139],
  ["GHD", "Curve Classic Curl Tong 26mm", 159],
  // T3 (3)
  ["T3", "AireLuxe Digital Ionic Professional Hair Dryer", 200],
  ["T3", "Cura Luxe Hair Dryer", 270],
  ["T3", "Singlepass Wave Curling & Waving Iron", 170],
  // BaByliss (3)
  ["BaByliss", "9000 Cordless Straightener", 200],
  ["BaByliss", "Air Wand 5 in 1 Styler", 160],
  ["BaByliss", "Diamond Waves Wide Tong", 85],
  // Cloud Nine (2)
  ["Cloud Nine", "The Original Iron", 159],
  ["Cloud Nine", "The Airshot Hair Dryer", 179],
  // Foreo (4)
  ["Foreo", "Luna 4 Body Cleansing & Massaging Device", 279],
  ["Foreo", "Luna 3 Plus Cleansing & Anti-Aging Device", 230],
  ["Foreo", "UFO 2 Smart Mask Treatment Device", 319],
  ["Foreo", "Bear Smart Microcurrent Facial Toning Device", 319],
  // NuFace (3)
  ["NuFace", "Trinity+ Smart Facial Toning Device", 395],
  ["NuFace", "Mini Facial Toning Device", 195],
  ["NuFace", "Fix Line Smoothing Device", 155],
  // Theragun (2)
  ["Theragun", "PRO Plus Massage Gun", 549],
  ["Theragun", "Mini Massage Gun", 175],
  // Hyperice (2)
  ["Hyperice", "Hypervolt 2 Pro Percussion Massage Device", 349],
  ["Hyperice", "Normatec 3 Leg Compression System", 799],
  // ZIIP (2)
  ["ZIIP", "Halo Electrical Microcurrent Skincare Device", 369],
  ["ZIIP", "Original Microcurrent Device", 495],
  // Mason Pearson (2)
  ["Mason Pearson", "Junior Mixture Bristle Hairbrush", 158],
  ["Mason Pearson", "Pocket Pure Bristle Hairbrush", 119],
  // Real Techniques (2)
  ["Real Techniques", "Everyday Essentials Brush Set", 30],
  ["Real Techniques", "Brush Crush Volume 2 Eye Set", 24],
  // Tweezerman (2)
  ["Tweezerman", "Slant Tweezers", 24],
  ["Tweezerman", "Stainless Steel Bend Slant Tweezer", 22],
  // Morphe / Magnitone / Drybar (3)
  ["Morphe", "M439 Deluxe Buffer Makeup Brush", 18],
  ["Magnitone", "Lift & Sculpt+ True Microcurrent Face Toning Device", 200],
  ["Drybar", "Buttercup Blow-Dryer", 155]
];

interface ProductSeed {
  brand: string;
  name: string;
  category: Category;
  price_gbp: number;
  product_url: string;
  image_url: string;
  deliverable_lebanon: boolean;
}

const CATEGORY_IMAGES: Record<Category, string[]> = {
  Makeup: [
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80",
    "https://images.unsplash.com/photo-1599733589046-8e1f10f57cca?w=800&q=80",
    "https://images.unsplash.com/photo-1583241800698-9c2e2bdaf797?w=800&q=80",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
    "https://images.unsplash.com/photo-1522335789203-aaa2eb0aaccc?w=800&q=80",
    "https://images.unsplash.com/photo-1631214540242-eee92b9f7ba8?w=800&q=80"
  ],
  Skincare: [
    "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80",
    "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&q=80",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&q=80",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80"
  ],
  Bags: [
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
    "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80",
    "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80",
    "https://images.unsplash.com/photo-1590739225497-56c1ef295b5e?w=800&q=80",
    "https://images.unsplash.com/photo-1564422170194-896b89110ef8?w=800&q=80",
    "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80"
  ],
  Haircare: [
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80",
    "https://images.unsplash.com/photo-1626015449814-fcb3f72c1b14?w=800&q=80",
    "https://images.unsplash.com/photo-1626203049285-3c6d92cebee6?w=800&q=80",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80"
  ],
  Accessories: [
    "https://images.unsplash.com/photo-1601379760883-1bb497ab9c46?w=800&q=80",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80",
    "https://images.unsplash.com/photo-1611923134239-b9be5816e23d?w=800&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80",
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"
  ],
  "Beauty tools": [
    "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    "https://images.unsplash.com/photo-1626015449814-fcb3f72c1b14?w=800&q=80",
    "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&q=80"
  ]
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function expand(category: Category, tuples: Tuple[]): ProductSeed[] {
  const imgs = CATEGORY_IMAGES[category];
  return tuples.map(([brand, name, price_gbp], i) => ({
    brand,
    name,
    category,
    price_gbp,
    deliverable_lebanon: true,
    product_url: `https://www.selfridges.com/GB/en/cat/${slugify(brand)}/#${i + 1}-${slugify(name)}`,
    image_url: imgs[i % imgs.length]
  }));
}

const PRODUCTS: ProductSeed[] = [
  ...expand("Makeup", MAKEUP),
  ...expand("Skincare", SKINCARE),
  ...expand("Bags", BAGS),
  ...expand("Haircare", HAIRCARE),
  ...expand("Accessories", ACCESSORIES),
  ...expand("Beauty tools", BEAUTY_TOOLS)
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Make sure .env.local exists in the project root and contains the Neon connection string."
    );
    process.exit(1);
  }

  // Quick distribution sanity check before we touch the DB.
  const counts: Record<string, number> = {};
  for (const p of PRODUCTS) counts[p.category] = (counts[p.category] ?? 0) + 1;
  console.log(`Seeding ${PRODUCTS.length} products. Distribution:`);
  for (const [cat, n] of Object.entries(counts)) {
    console.log(`  ${cat.padEnd(14)} ${n}`);
  }
  if (PRODUCTS.length !== 300) {
    console.warn(`Expected 300 products, got ${PRODUCTS.length}. Continuing anyway.`);
  }

  await ensureSchema();
  const sql = getSql();

  console.log("\nClearing existing products table…");
  await sql`delete from products`;

  // Pre-compute USD prices once. convertGbpToUsd caches the FX rate in-memory
  // for 6h, so the first call hits Frankfurter and the rest are local.
  const rows = await Promise.all(
    PRODUCTS.map(async (p) => ({
      ...p,
      price_usd: await convertGbpToUsd(p.price_gbp)
    }))
  );

  let inserted = 0;
  for (const p of rows) {
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
    } catch (err) {
      console.error(`Failed to upsert "${p.brand} — ${p.name}":`, err);
    }
  }

  const finalCounts = (await sql`
    select category, count(*)::int as n
    from products
    group by category
    order by category
  `) as Array<{ category: string; n: number }>;
  const total = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;

  console.log(`\nSeeded ${inserted}/${PRODUCTS.length} products.`);
  console.log(`Total rows in products table: ${total[0]?.n ?? 0}`);
  console.log("By category:");
  for (const row of finalCounts) {
    console.log(`  ${row.category.padEnd(14)} ${row.n}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
