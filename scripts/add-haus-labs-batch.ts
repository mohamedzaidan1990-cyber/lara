/**
 * Bulk-add 14 Haus Labs by Lady Gaga products from Sephora ME (Qatar), each
 * with its full shade range (where the product has shades) and a per-shade
 * swatch image sourced from Sephora ME's own CDN (flat-colour swatch —
 * Sephora ME provides no distinct per-shade product photography for any of
 * these products, confirmed by direct CDN inspection, same limitation as
 * the Color Fuse Blush Powder added earlier).
 *
 * Pricing: price_usd = round(QAR / 3.645 + 8, 2), per user instruction.
 * price_gbp = round(price_usd / 1.35, 2), using the site's canonical
 * GBP:USD FX rate (lib/currency.ts FIXED_RATE). price_locked = true since
 * these are manually-set prices, not Selfridges-cost-basis prices.
 *
 * Run:  npx ts-node scripts/add-haus-labs-batch.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
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
import { shadeScore } from "../lib/shade-options";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const CDN = "https://img-product.sephora.me";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function usdFromQar(qar: number): number {
  return round2(qar / 3.645 + 8);
}
function gbpFromUsd(usd: number): number {
  return round2(usd / 1.35);
}

interface Shade {
  name: string;
  variantId: string;
  // Overrides the product-level shadesFolder for this one shade — a couple
  // of shades on Sephora ME live under a different Shades_XXXX folder than
  // the rest of their own product's range (confirmed per-image, not a typo).
  folder?: string;
}

interface ProductSpec {
  slug: string;
  name: string;
  subcategory: string;
  qar: number;
  description: string;
  productUrl: string;
  // Path (no hash, no query) to the main hero image, relative to CDN root.
  mainImagePath: string;
  // Shades folder number for this product's per-shade swatch images (if any).
  shadesFolder?: string;
  shades: Shade[];
  // true if Sephora ME has no distinct per-shade image at all for this
  // product (every shade falls back to the single main image).
  noDistinctShadeImages?: boolean;
}

const PRODUCTS: ProductSpec[] = [
  {
    slug: "bio-radiant-gel-powder-highlighter",
    name: "Bio-Radiant Gel-Powder Highlighter",
    subcategory: "Highlighter",
    qar: 185,
    description:
      "An innovative, clean highlighting powder that melts onto skin, imparting a pure, radiant glow that optically smooths and illuminates. This super-gliding gel-powder highlighter has a blurring effect that quickly smooths skin. The weightless formula is infused with a custom blend of multidimensional pearls and reflective pigments that deliver pure radiance in a soft-focus glow. Safe for eyes. HausTech Powered™ with fermented arnica + silver vine extract.",
    productUrl: "https://www.sephora.me/qa-en/p/bio-radiant-gel-powder-highlighter/P10050991?productVariantId=689212",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5717/P10050991_principal.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "Fire Opal", variantId: "689206" },
      { name: "Moonstone", variantId: "689208" },
      { name: "Peach Quartz", variantId: "689209" },
      { name: "Pink Amethyst", variantId: "689210" },
      { name: "Rose Quartz", variantId: "689212" },
      { name: "Sunstone", variantId: "689213" }
    ]
  },
  {
    slug: "concealer-brush",
    name: "Concealer Brush",
    subcategory: "Brushes & Applicators",
    qar: 130,
    description:
      "Designed with a domed curve and pointed tip, this luxe concealer brush was engineered for effortless blending and coverage in hard-to-reach areas. The perfect balance of densely packed yet ultra-soft bristles magically melts product onto the skin seamlessly in just a few strokes. Its unique, domed shape mimics the shape of your fingertip, offering unmatched ease, speed and undetectable coverage.",
    productUrl: "https://www.sephora.me/qa-en/p/concealer-brush/P10054156?productVariantId=706780",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5717/P10054156_principal.jpg",
    shades: []
  },
  {
    slug: "foundation-brush",
    name: "Foundation Brush",
    subcategory: "Brushes & Applicators",
    qar: 170,
    description:
      "A luxe, custom foundation brush designed to seamlessly build, buff, and blend with control and ease. This iconic brush was designed to optimize your foundation performance. The ultra-soft, dense, synthetic bristles seamlessly apply and blur product onto the face for a natural-looking, airbrushed finish while the short, ergonomic, aluminum handle offers control of pressure and application.",
    productUrl: "https://www.sephora.me/qa-en/p/foundation-brush/P10050992?productVariantId=689234",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5717/P10050992_principal.jpg",
    shades: []
  },
  {
    slug: "triclone-skin-tech-concealer",
    name: "Triclone Skin Tech Concealer",
    subcategory: "Concealer",
    qar: 145,
    description:
      "A long-wearing, non-comedogenic concealer that visibly blurs, brightens and conceals with medium, buildable coverage that de-puffs after 2 weeks of daily use. Made with high-tech, skin-loving ingredients and flexible pigments that adapt to the skin. This proprietary formula visibly blurs fine lines, brightens, de-puffs under eyes after 2 weeks of daily use, conceals redness and hyperpigmentation and hydrates skin. Mica-free and non-comedogenic for all skin types. HausTech Powered™ with 20+ skincare ingredients including our patent-pending fermented arnica. Size: 7ml.",
    productUrl: "https://www.sephora.me/qa-en/p/triclone-skin-tech-concealer/P10052817?productVariantId=706763",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5717/P10052817_principal.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "54 Deep Neutral", variantId: "706779" },
      { name: "53 Deep Neutral", variantId: "706778" },
      { name: "52 Deep Neutral", variantId: "706777" },
      { name: "51 Deep Peach", variantId: "706776" },
      { name: "50 Deep Golden", variantId: "706775" },
      { name: "44 Medium Deep Neutral", variantId: "706774" },
      { name: "43 Medium Deep Golden", variantId: "706773" },
      { name: "42 Medium Deep Neutral", variantId: "706772" },
      { name: "41 Medium Deep Neutral", variantId: "706771" },
      { name: "40 Medium Deep Golden", variantId: "706770" },
      { name: "34 Medium Golden", variantId: "706769" },
      { name: "33 Medium Rosy", variantId: "706768" },
      { name: "32 Medium Golden", variantId: "706767" },
      { name: "31 Medium Neutral", variantId: "706766" },
      { name: "30 Medium Peach", variantId: "706765" },
      { name: "24 Light Medium Neutral", variantId: "706764" },
      { name: "23 Light Medium Golden", variantId: "706763" },
      { name: "22 Light Medium Peach", variantId: "706762" },
      { name: "21 Light Medium Neutral", variantId: "706761" },
      { name: "20 Light Medium Peach", variantId: "706760" },
      { name: "14 Light Peach", variantId: "706759" },
      { name: "13 Light Neutral", variantId: "706758" },
      { name: "12 Light Rosy", variantId: "706757" },
      { name: "11 Light Neutral", variantId: "706756" },
      { name: "10 Light Golden", variantId: "706755" },
      { name: "06 Fair Rosy", variantId: "706754" },
      { name: "05 Fair Peach", variantId: "706753" },
      { name: "04 Fair Neutral", variantId: "706752" },
      { name: "03 Fair Rosy", variantId: "706751" },
      { name: "02 Fair Golden", variantId: "706750" }
    ]
  },
  {
    slug: "triclone-skin-tech-foundation",
    name: "Triclone Skin Tech Foundation",
    subcategory: "Foundation",
    qar: 225,
    description:
      "A medium coverage, weightless, non-comedogenic foundation with fermented arnica that helps reduce redness and protects from environmental stress. Made with 20+ skincare ingredients, this proprietary formula delivers ultra-comfortable, longwear performance that's suitable for all skin types, including sensitive and acne-prone. Its weightless, serum-like texture seamlessly blurs and smooths for a natural, luminous finish that wears all day. HausTech Powered™ with 20+ skincare ingredients including our patent-pending fermented arnica. Size: 30ml.",
    productUrl: "https://www.sephora.me/qa-en/p/triclone-skin-tech-foundation/P10050998?productVariantId=689161",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5717/P10050998_principal.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "015 Fair Warm", variantId: "689142" },
      { name: "040 Fair Neutral", variantId: "689144" },
      { name: "050 Fair Cool", variantId: "689145" },
      { name: "060 Fair Warm", variantId: "689146" },
      { name: "070 Fair Neutral", variantId: "689147" },
      { name: "100 Light Neutral", variantId: "689148" },
      { name: "110 Light Neutral", variantId: "689149" },
      { name: "120 Light Warm", variantId: "689150" },
      { name: "130 Light Warm", variantId: "689151" },
      { name: "145 Light Cool", variantId: "689152" },
      { name: "160 Light Neutral", variantId: "689153" },
      { name: "175 Light Neutral", variantId: "689154" },
      { name: "190 Light Cool", variantId: "689155" },
      { name: "200 Light Medium Neutral", variantId: "689156" },
      { name: "210 Light Medium Neutral", variantId: "689157" },
      { name: "220 Light Medium Warm", variantId: "689158" },
      { name: "230 Light Medium Cool", variantId: "689159" },
      { name: "240 Light Medium Warm", variantId: "689160" },
      { name: "250 Light Medium Neutral", variantId: "689161" },
      { name: "260 Light Medium Cool", variantId: "689162" },
      { name: "270 Light Medium Neutral", variantId: "689163" },
      { name: "280 Light Medium Neutral", variantId: "689164" },
      { name: "300 Medium Neutral", variantId: "689165" },
      { name: "310 Medium Warm", variantId: "689166" },
      { name: "325 Medium Warm", variantId: "689167" },
      { name: "330 Medium Cool", variantId: "689168" },
      { name: "340 Medium Cool", variantId: "689169" },
      { name: "350 Medium Cool", variantId: "689170" },
      { name: "360 Medium Warm", variantId: "689171" },
      { name: "370 Medium Neutral", variantId: "689172" },
      { name: "385 Medium Neutral", variantId: "689173" },
      { name: "400 Medium Deep Warm", variantId: "689174" },
      { name: "415 Medium Deep Cool", variantId: "689175" },
      { name: "425 Medium Deep Neutral", variantId: "689176" },
      { name: "440 Medium Deep Cool", variantId: "689177" },
      { name: "450 Medium Deep Warm", variantId: "689178" },
      { name: "460 Medium Deep Warm", variantId: "689179" },
      { name: "470 Medium Deep Cool", variantId: "689180" },
      { name: "480 Medium Deep Neutral", variantId: "689181" },
      { name: "500 Deep Neutral", variantId: "689183" },
      { name: "510 Deep Warm", variantId: "689184" },
      { name: "530 Deep Neutral", variantId: "689186" },
      { name: "540 Deep Neutral", variantId: "689187" },
      { name: "560 Deep Neutral", variantId: "689188" },
      { name: "570 Deep Cool", variantId: "689189" }
    ]
  },
  {
    slug: "power-sculpt-velvet-bronzer",
    name: "Power Sculpt Velvet Bronzer",
    subcategory: "Bronzer & Contour",
    qar: 170,
    description:
      "A non-comedogenic, talc-free bronzer with fermented arnica and squalane that seamlessly blends and blurs while adding natural warmth with up to 12-hours of wear. A clean, creamy powder bronzer created with a proprietary technology that coats powder ingredients with potent skincare actives like hyaluronic acid. It delivers skip-proof, velvety texture and true colour payoff without any white cast in one groundbreaking formula with shades for everyone. Size: 12g.",
    productUrl: "https://www.sephora.me/qa-en/p/power-sculpt-velvet-bronzer/P10057654?productVariantId=728038",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5718/P10057654_principal.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "Soleil Sand Fair", variantId: "728037" },
      { name: "Bronzed Umber Light", variantId: "728035" },
      { name: "Terra Sol Light Medium", variantId: "728038" },
      { name: "Amber Horizon Medium", variantId: "728034" },
      { name: "Acacia Ember Medium Deep", variantId: "728033" },
      { name: "Redwood Medium Deep", variantId: "764888" },
      { name: "Jatoba Sun Deep", variantId: "728036" },
      { name: "Khaya Spice Deep", variantId: "764887" }
    ]
  },
  {
    slug: "le-monster-lip-crayon",
    name: "Le Monster Lip Crayon",
    subcategory: "Lip Liner",
    qar: 110,
    description:
      "A clean, comfortable, creamy lipstick that wraps lips in moisturizing mango seed oil, lip boosting peptides and high-impact colour. Experience pigment, precision and nourishment in one slim lip crayon. Le Monster delivers the ultimate balance of comfort and colour in lightweight, conditioning demi-matte shades. HausTech Powered™ with mango seed oil + ceramides.",
    productUrl: "https://www.sephora.me/qa-en/p/le-monster-lip-crayon/P10050994?productVariantId=689113",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res/alternates/PID_alternate1/PID_alternate1_2958/P10050994_1.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "Garnet Matte", variantId: "689113" },
      { name: "Maple Matte", variantId: "689117" },
      { name: "Mauve Matte", variantId: "689118" },
      { name: "Melon Matte", variantId: "689119" },
      { name: "Mocha Matte", variantId: "689120" },
      { name: "Rose Matte", variantId: "689122" }
    ]
  },
  {
    slug: "precision-sculpt-shaping-balm",
    name: "Precision Sculpt Shaping Balm",
    subcategory: "Bronzer & Contour",
    qar: 135,
    description:
      "A precision contour stick that defines and visibly lifts, with a buttery texture that effortlessly blends, seamlessly shapes, and sets for 12 hours. Like good shapewear, this long-wear balm sculpts undetectably and seamlessly. Formulated with five skincare actives, it visibly enhances skin's elasticity and firmness post-application. Designed for all skin types, it chisels with a natural matte finish in a range of sculptural shades with artistry undertones.",
    productUrl: "https://www.sephora.me/qa-en/p/precision-sculpt-shaping-balm/P1000210675?productVariantId=780995",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/alternates/PID_alternate1/PID_alternate1_5071/P1000210675_1.jpg",
    shadesFolder: "3768",
    shades: [
      { name: "Profile", variantId: "780995" },
      { name: "Chisel", variantId: "780991", folder: "3783" },
      { name: "Angle", variantId: "780997", folder: "3783" },
      { name: "Sculpt", variantId: "780994" },
      { name: "Silhouette", variantId: "780993" },
      { name: "Taper", variantId: "780999" },
      { name: "Curve", variantId: "780992" },
      { name: "Dart", variantId: "780996" },
      { name: "Model", variantId: "780998" }
    ]
  },
  {
    slug: "phd-hybrid-lip-glaze",
    name: "PhD Hybrid Lip Glaze",
    subcategory: "Lip Gloss & Oil",
    qar: 115,
    description:
      "A non-sticky, next-gen, four-in-one glaze that fuses a lip oil, balm, plumper, and gloss to hydrate lips and provide burn-free plumping after two weeks of continuous use. A science-forward, peptide-rich formula that combines the hydration of a lip oil, cushion of a balm, volumizing effect of a plumper and high shine of a gloss. It's formulated with a custom blend of Maxi-Lip™ and Volulip™ to promote the appearance of fuller lips without any uncomfortable irritation. HausTech Powered™ with polyplumper peptide complex + vegan collagen.",
    productUrl: "https://www.sephora.me/qa-en/p/phd-hybrid-lip-glaze/P10057409?productVariantId=721162",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5717/P10057409_principal.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "Guava", variantId: "721162" },
      { name: "Cocoa", variantId: "721160" },
      { name: "Fig", variantId: "721161" },
      { name: "Macaron", variantId: "721163" },
      { name: "Persimmon", variantId: "721164" },
      { name: "Praline", variantId: "721165" }
    ]
  },
  {
    slug: "dual-ended-precision-sculpting-brush",
    name: "Dual-Ended Precision Sculpting Brush",
    subcategory: "Brushes & Applicators",
    qar: 165,
    description:
      "A dual-ended brush with ultra-soft, vegan bristles designed to enhance, define, and diffuse cream or powder formulas into the hollows of the face. This brush is a tool for precision and versatility. Use the angled tip for targeted sculpting or crease definition and the domed end to blend and blur with ease. Designed to follow the contours of your face, this brush transforms any product into a seamless extension of your vision.",
    productUrl: "https://www.sephora.me/qa-en/p/dual-ended-precision-sculpting-brush/P1000210674?productVariantId=781594",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res/PID_principal/PID_principal_5425/P1000210674_principal.jpg",
    shades: []
  },
  {
    slug: "bio-blurring-loose-setting-powder",
    name: "Bio-Blurring Loose Setting Powder",
    subcategory: "Powder",
    qar: 170,
    description:
      "A clean, skincare-infused loose powder that blurs imperfections, smooths skin, and optimizes makeup performance. This multitasking magician combines talc-free, gel-powder technology and finely milled pigments to deliver a weightless veil of translucent colour with a comfortable, flawless-looking finish. Formulated to seamlessly melt onto skin, it subtly blurs, visibly brightens, and perfects with every stroke. HausTech Powered™ with fermented arnica + plant squalane.",
    productUrl: "https://www.sephora.me/qa-en/p/bio-blurring-loose-setting-powder/P10050990?productVariantId=689100",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res/alternates/PID_alternate1/PID_alternate1_2958/P10050990_1.jpg",
    shades: []
  },
  {
    slug: "bio-radiant-glassy-highlighter-balm",
    name: "Bio-Radiant Glassy Highlighter Balm",
    subcategory: "Highlighter",
    qar: 140,
    description:
      "A hydrating, multi-use highlighter stick for cheeks, eyes, lips, and body formulated with 64% skincare that delivers a long-lasting, glassy glow. Glide on ethereal glass skin without disturbing makeup underneath. Formulated with hyaluronic acid, squalane, and marine extracts, this serum-based highlighter immediately boosts hydration by 59%. The highlighter's slim silhouette makes it easy to add long-lasting, glassy radiance anywhere on the face and body. HausTech Powered™ with sea fennel + wakame extracts.",
    productUrl: "https://www.sephora.me/qa-en/p/bio-radiant-glassy-highlighter-balm/P10061973?productVariantId=755470",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res-AE/PID_principal/PID_principal_5718/P10061973_principal.jpg",
    noDistinctShadeImages: true,
    shades: [
      { name: "Pure Glass", variantId: "755470" },
      { name: "Glassy Opal", variantId: "755465" },
      { name: "Glassy Pink Opal", variantId: "755466" },
      { name: "Glassy Champagne Quartz", variantId: "755467" },
      { name: "Glassy Topaz", variantId: "755468" },
      { name: "Glassy Citrine", variantId: "755469" }
    ]
  },
  {
    slug: "dual-ended-multi-purpose-brush",
    name: "Dual-Ended Multi-Purpose Brush",
    subcategory: "Brushes & Applicators",
    qar: 190,
    description:
      "An innovative, multi-use brush with ultra-soft bristles. Use either side with cream and powder formulas to sculpt, define, and seamlessly blend. A multi-use, dual-ended brush designed to be used with creams or powders. It is complete with a domed side for blending and diffusing and an angled side for targeted sculpting and defining. Ultra-soft and densely packed synthetic fibers are engineered for superior performance.",
    productUrl: "https://www.sephora.me/qa-en/p/dual-ended-multi-purpose-brush/P10057653?productVariantId=721175",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res/alternates/PID_alternate1/PID_alternate1_3609/P10057653_1.jpg",
    shades: []
  },
  {
    slug: "color-fuse-glassy-blush-balm",
    name: "Color Fuse Glassy Blush Balm",
    subcategory: "Blush",
    qar: 155,
    description:
      "A long-lasting, multi-use lip and cheek balm that glides on buildable glassy colour in an easy-to-use cream stick. Get summer skin in a swipe with this weightless balm that delivers buildable colour and a glassy finish that lasts 8 hours. Infused with goji berry complex that makes skin look more plump and formulated with 70% skincare actives to immediately boost skin hydration by +62%. HausTech Powered™ with fermented arnica + goji berry complex.",
    productUrl: "https://www.sephora.me/qa-en/p/color-fuse-glassy-blush-balm/P10058750?productVariantId=728429",
    mainImagePath: "/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res/alternates/PID_alternate1/PID_alternate1_3729/P10058750_1.jpg",
    shadesFolder: "4143",
    shades: [
      { name: "Glassy Hibiscus", variantId: "728429" },
      { name: "Glassy Lilac", variantId: "728430" },
      { name: "Glassy Pomelo", variantId: "728431" },
      { name: "Glassy Rosette", variantId: "728432" },
      { name: "Glassy Acai", variantId: "728433" },
      { name: "Glassy Watermelon", variantId: "728434" },
      { name: "Glassy Tangelo", variantId: "729492" },
      { name: "Glassy Pitaya", variantId: "729493" },
      { name: "Glassy Clove", variantId: "764246" },
      { name: "Glassy Ginger", variantId: "764247" },
      { name: "Glassy Cayenne", variantId: "764248" },
      { name: "Glassy Cinnamon", variantId: "764249" }
    ]
  }
];

function slugifyShade(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function shadeImageUrl(folder: string, variantId: string): string {
  return `${CDN}/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/images/hi-res/Shades/Shades_${folder}/${variantId}_th.jpg?sw=1320&sm=fit&q=90`;
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Referer: "https://www.sephora.me/"
      }
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return false; // guard against tiny error placeholders
    writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = getSql();
  const publicDir = resolve(process.cwd(), "public");
  const failures: string[] = [];

  for (const p of PRODUCTS) {
    console.log(`\n=== ${p.name} ===`);

    // --- main image ---
    const mainFile = `haus-labs-${p.slug}.jpg`;
    const mainUrl = `${CDN}${p.mainImagePath}?sw=1320&sm=fit&q=90`;
    const mainOk = await downloadImage(mainUrl, resolve(publicDir, mainFile));
    if (!mainOk) {
      failures.push(`${p.name}: main image failed (${mainUrl})`);
      console.log(`  ! main image FAILED`);
      continue;
    }
    console.log(`  main image -> public/${mainFile}`);

    // --- shade images ---
    const shadeImagePaths: Record<string, string> = {};
    if (p.shades.length > 0 && p.shadesFolder && !p.noDistinctShadeImages) {
      for (const s of p.shades) {
        const fname = `haus-labs-${p.slug}-${slugifyShade(s.name)}.jpg`;
        const url = shadeImageUrl(s.folder ?? p.shadesFolder, s.variantId);
        const ok = await downloadImage(url, resolve(publicDir, fname));
        if (ok) {
          shadeImagePaths[s.variantId] = `/${fname}`;
          console.log(`  shade ${s.name} -> public/${fname}`);
        } else {
          failures.push(`${p.name}: shade "${s.name}" (${s.variantId}) image failed (${url})`);
          console.log(`  ! shade ${s.name} FAILED (${url})`);
        }
      }
    } else if (p.noDistinctShadeImages) {
      // Reuse the main image for every shade — Sephora ME has no distinct
      // per-shade asset for this product.
      for (const s of p.shades) {
        shadeImagePaths[s.variantId] = `/${mainFile}`;
      }
    }

    // --- product row ---
    const priceUsd = usdFromQar(p.qar);
    const priceGbp = gbpFromUsd(priceUsd);
    const shadesJson = p.shades.map((s) => ({
      name: s.name,
      swatch_url: shadeImagePaths[s.variantId] ?? `/${mainFile}`,
      image_url: shadeImagePaths[s.variantId] ?? `/${mainFile}`
    }));

    const upserted = (await sql`
      insert into products (
        brand, name, category, subcategory, description,
        price_gbp, price_usd, product_url, image_url,
        price_locked, deliverable_lebanon, shades, shades_checked_at
      )
      values (
        'Haus Labs', ${p.name}, 'Makeup', ${p.subcategory}, ${p.description},
        ${priceGbp}, ${priceUsd}, ${p.productUrl}, ${"/" + mainFile},
        true, true, ${JSON.stringify(shadesJson)}::jsonb, now()
      )
      on conflict (product_url) do update set
        subcategory = excluded.subcategory,
        description = excluded.description,
        price_gbp = excluded.price_gbp,
        price_usd = excluded.price_usd,
        image_url = excluded.image_url,
        price_locked = true,
        shades = excluded.shades,
        shades_checked_at = now()
      returning id
    `) as Array<{ id: string }>;
    const productId = upserted[0].id;
    console.log(`  product row -> ${productId} ($${priceUsd} / £${priceGbp})`);

    // --- variant rows ---
    for (const s of p.shades) {
      const imgUrl = shadeImagePaths[s.variantId] ?? `/${mainFile}`;
      const score = shadeScore(s.name);
      await sql`
        insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
        values (${productId}, ${s.name}, ${imgUrl}, ${imgUrl}, ${score})
        on conflict (product_id, shade_name) do update set
          shade_image_url = excluded.shade_image_url,
          swatch_url = excluded.swatch_url,
          sort_order = excluded.sort_order
      `;
    }

    if (p.shades.length > 0) {
      const lightest = (await sql`
        update products
        set light_shade_image_url = (
          select shade_image_url from product_variants
          where product_id = ${productId} and shade_image_url is not null and shade_image_url <> ''
          order by sort_order asc limit 1
        ),
        variants_checked_at = now()
        where id = ${productId}
        returning light_shade_image_url
      `) as Array<{ light_shade_image_url: string | null }>;
      console.log(`  ${p.shades.length} shades -> light_shade_image_url = ${lightest[0].light_shade_image_url}`);
    }
  }

  console.log("\n\n=== SUMMARY ===");
  if (failures.length === 0) {
    console.log("All images downloaded successfully.");
  } else {
    console.log(`${failures.length} failure(s):`);
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
