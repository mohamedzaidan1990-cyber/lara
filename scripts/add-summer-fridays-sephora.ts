/**
 * Add the Summer Fridays range from Sephora ME (Qatar) brand page
 * (sephora.me/qa-en/brands/summer-fridays/SUMME), with every shade.
 *
 * Pricing (per user instruction): price_usd = round(QAR / 3.645 + 8, 2) for
 * single items, + 13 instead of + 8 for sets/kits. price_gbp = usd / 1.35
 * (lib/currency.ts FIXED_RATE). price_locked = true.
 *
 * Sephora ME lists some products with several sizes at different prices
 * (Jet Lag Mask, Cloud Dew, cleanser, EDP) and the body mist/butter in
 * scent × size. Our product_variants carry no price, so each size is its own
 * product, and each body mist/butter scent is its own product too (scents
 * aren't a "shade", so isShadeRelevant() wouldn't show a picker for them).
 * product_url is the PDP plus ?productVariantId=<sku>, which keeps the
 * unique product_url distinct per split product.
 *
 * Images (from Sephora ME's CDN, self-hosted in public/summer-fridays/ since
 * img-product.sephora.me isn't on the image-proxy allowlist): shade_image_url
 * is the per-shade SKU pack shot; swatch_url is Sephora's flat colour
 * thumbnail (Shades/..._th.jpg).
 *
 * Flushed Lip Stain was already in the catalogue (db7e7faa…, $38, no shades)
 * — this updates that row rather than adding a duplicate.
 *
 * Run:  npx tsx scripts/add-summer-fridays-sephora.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const CDN = "https://img-product.sephora.me/dw/image/v2/BKWK_PRD/on/demandware.static/-/Sites-masterCatalog_Sephora/default/";
const PDP = "https://www.sephora.me/qa-en/p/";
const DIR = "summer-fridays";
const EXISTING_FLUSHED_LIP_STAIN = "db7e7faa-413b-4fea-9d0d-87ace449c8ed";

const round2 = (n: number) => Math.round(n * 100) / 100;
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// [shade name, SKU pack shot path, flat swatch path] — paths relative to CDN.
type Shade = [string, string, string];

interface Spec {
  name: string;
  category: string;
  subcategory: string;
  qar: number;
  set?: boolean;
  pdp: string; // "<handle>/<Pid>"
  sku: string; // Sephora variant id (product_url discriminator)
  image: string; // main image path relative to CDN
  description: string;
  shades?: Shade[];
}

const PRODUCTS: Spec[] = [
  // ----- Sets / kits (+$13) -----
  {
    name: "The Lip Butter Balm Minis", category: "Makeup", subcategory: "Lip Care", qar: 122, set: true,
    pdp: "the-lip-butter-balm-minis/P1000214927", sku: "825720",
    image: "dw694330d6/images/hi-res-AE/SKU/SKU_7950/825720_swatch.jpg",
    description: "Your holiday treat on repeat. A limited-edition set of mini sizes of the award-winning Lip Butter Balm in four favourite flavours."
  },
  {
    name: "Marshmallow Minis", category: "Skincare", subcategory: "Sets", qar: 171, set: true,
    pdp: "marshmallow-minis/P1000214468", sku: "825965",
    image: "dwaab63828/images/hi-res/PID_principal/PID_principal_5812/P1000214468_principal.jpg",
    description: "Holiday minis in the marshmallow scent: travel-ready sizes of Body Butter Balm, Body Fragrance Mist and Lip Butter Balm."
  },
  {
    name: "The Holiday Trio", category: "Skincare", subcategory: "Sets", qar: 234, set: true,
    pdp: "the-holiday-trio/P1000214858", sku: "826747",
    image: "dwc3d05ac6/images/hi-res-AE/PID_principal/PID_principal_5830/P1000214858_principal.jpg",
    description: "A holiday-exclusive trio: the award-winning Jet Lag Mask® and two limited-edition Lip Butter Balm flavours — Sugar Plum and Mocha Bon Bon."
  },
  {
    name: "Sweet Summer Minis", category: "Makeup", subcategory: "Lip Care", qar: 112, set: true,
    pdp: "sweet-summer-minis/P1000213504", sku: "810697",
    image: "dwe410f943/images/hi-res-AE/SKU/SKU_7618/810697_swatch.jpg",
    description: "Mini sizes of three limited-edition Lip Butter Balm shades — Sea Salt Caramel, Berry Sorbet and Peach Granita (5g each). Shea and murumuru seed butters with vegan waxes soothe and condition lips in seconds."
  },
  {
    name: "The Jet Lag Essentials", category: "Skincare", subcategory: "Sets", qar: 165, set: true,
    pdp: "the-jet-lag-essentials/P10061829", sku: "763098",
    image: "dw0c63823f/images/hi-res/SKU/SKU_6013/763098_swatch.jpg",
    description: "On-the-go hydration with minis from the Jet Lag™ collection: Jet Lag Mask, Skin Soothing Hydration Mist, Deep Hydration Serum, Overnight Eye Serum and Eye Patches."
  },

  // ----- Lips -----
  {
    name: "Lip Butter Balm", category: "Makeup", subcategory: "Lip Care", qar: 116,
    pdp: "lip-butter-balm/P10021822", sku: "670227",
    image: "dw961f3f6a/images/hi-res-AE/SKU/SKU_7599/670227_swatch.jpg",
    description: "Like a blanket of comforting moisture, this vegan lip mask wraps and seals in hydration for hours. It hydrates and soothes parched lips in seconds for the softest, smoothest lips, day or night. 15g.",
    shades: [
      ["Pink Sugar", "dw961f3f6a/images/hi-res-AE/SKU/SKU_7599/670227_swatch.jpg", "dwaf1d8a69/images/hi-res/Shades/Shades_2622/670227_th.jpg"],
      ["Pink Guava", "dwf76a9920/images/hi-res/SKU/763099_swatch.jpg", "dw6ea609f1/images/hi-res/Shades/Shades_3436/763099_th.jpg"],
      ["Poppy", "dw7a47c58b/images/hi-res/SKU/SKU_4939/654019_swatch.jpg", "dwdc4fa13e/images/hi-res/Shades/Shades_2622/654019_th.jpg"],
      ["Cherry", "dw2a70af7a/images/hi-res-AE/SKU/SKU_7599/670226_swatch.jpg", "dwad6f94a8/images/hi-res/Shades/Shades_2556/670226_th.jpg"],
      ["Sweet Mint", "dwbbbf53a6/images/hi-res/SKU/SKU_4939/718993_swatch.jpg", "dw26ed8815/images/hi-res/Shades/718993_th.jpg"],
      ["Vanilla", "dwf6fe00f7/images/hi-res-AE/SKU/SKU_7599/569958_swatch.jpg", "dwd8dbae98/images/hi-res/Shades/569958_th.jpg"],
      ["Toasted Marshmallow", "dw223ebfd3/images/hi-res/SKU/SKU_7456/814123_swatch.jpg", "dw70a3f2dd/images/hi-res/Shades/814123_thumbnail.jpg"],
      ["Vanilla Beige", "dw68931e57/images/hi-res/SKU/SKU_2667/575239_swatch.jpg", "dw4fb39d57/images/hi-res/Shades/Shades_1412/575239_th.jpg"],
      ["Brown Sugar", "dwc97723fd/images/hi-res/SKU/SKU_4193/654018_swatch.jpg", "dw4093bc9a/images/hi-res/Shades/Shades_2622/654018_th.jpg"],
      ["Hot Cocoa", "dw6bdd48a0/images/hi-res/SKU/SKU_5446/742496_swatch.jpg", "dwcfaedac4/images/hi-res/Shades/Shades_2918/742496_th.jpg"],
      ["Iced Coffee", "dwb2805a85/images/hi-res/SKU/SKU_5393/722275_swatch.jpg", "dw23bbb13a/images/hi-res/Shades/Shades_2917/722275_th.jpg"],
      ["Strawberry Soft Serve", "dweae8be1c/images/hi-res-AE/SKU/SKU_7745/818289_swatch.jpg", "dw4a0e774d/images/hi-res/Shades/Shades_4218/818289_th.jpg"],
      ["Sugar Plum", "dwdfd9a4ca/images/hi-res/SKU/SKU_7978/832423_swatch.jpg", "dw202bbf97/images/hi-res/Shades/Shades_4580/832423_th.jpg"],
      ["Mocha Bonbon", "dw04924927/images/hi-res/SKU/SKU_7978/832424_swatch.jpg", "dw9f116d45/images/hi-res/Shades/Shades_4580/832424_th.jpg"]
    ]
  },
  {
    name: "Flushed Lip Stain", category: "Makeup", subcategory: "Lipstick", qar: 108,
    pdp: "flushed-lip-stain/P1000211776", sku: "799714",
    image: "dw846549f5/images/hi-res/SKU/SKU_7151/799714_swatch.jpg",
    description: "A full sweep of soft, buildable, long-lasting colour for up to 12 hours of wear. The non-drying formula works as an all-over colour wash or as a liner, and layers perfectly with SoftLine Lip Liners, Lip Butter Balm and Dream Lip Oil.",
    shades: [
      ["Rosette", "dw7a025770/images/hi-res/SKU/SKU_7150/799763_swatch.jpg", "dwa25d4279/images/hi-res/Shades/Shades_4012/799763_th.jpg"],
      ["Slipper", "dw907c73a7/images/hi-res/SKU/SKU_7151/799764_swatch.jpg", "dwb52ce948/images/hi-res/Shades/Shades_4012/799764_th.jpg"],
      ["Mocha", "dw9a91db09/images/hi-res/SKU/SKU_7151/799762_swatch.jpg", "dw3128c8d0/images/hi-res/Shades/Shades_4012/799762_th.jpg"],
      ["Plum", "dw0769f1dd/images/hi-res/SKU/SKU_7150/799713_swatch.jpg", "dwbc6a227f/images/hi-res/Shades/Shades_4013/799713_th.jpg"],
      ["Almond", "dw846549f5/images/hi-res/SKU/SKU_7151/799714_swatch.jpg", "dwc49b511c/images/hi-res/Shades/Shades_4012/799714_th.jpg"],
      ["Maple", "dw50d4c103/images/hi-res/SKU/SKU_7151/799761_swatch.jpg", "dwa0085d5e/images/hi-res/Shades/Shades_4013/799761_th.jpg"]
    ]
  },
  {
    name: "Dream Lip Oil", category: "Makeup", subcategory: "Lip Gloss & Oil", qar: 127,
    pdp: "dream-lip-oil/P10057506", sku: "720230",
    image: "dwfb8282bd/images/hi-res/SKU/SKU_5100/720230_swatch.jpg",
    description: "A plush lip oil that glides on like a dream for a high-shine tint and deep hydration. The non-sticky formula nourishes lips with a vegan blend of nine moisturising oils plus vitamin E for long-lasting softness and shine. 4.5ml.",
    shades: [
      ["Blush Dreams", "dwfb8282bd/images/hi-res/SKU/SKU_5100/720230_swatch.jpg", "dwa1500e5d/images/hi-res/Shades/Shades_2769/720230_th.jpg"],
      ["Pink Cloud", "dwc66a9f96/images/hi-res/SKU/SKU_5100/720229_swatch.jpg", "dw6d22e810/images/hi-res/Shades/Shades_2769/720229_th.jpg"],
      ["Mauve", "dwcdbceab7/images/hi-res/SKU/SKU_5100/720228_swatch.jpg", "dw5db17e63/images/hi-res/Shades/Shades_2769/720228_th.jpg"],
      ["Rosewood Nights", "dw8361cbed/images/hi-res/SKU/SKU_5100/720227_swatch.jpg", "dw719ce839/images/hi-res/Shades/Shades_2769/720227_th.jpg"],
      ["Rose Bud", "dw2eab21ac/images/hi-res/SKU/SKU_5942/749242_swatch.jpg", "dw9e754e23/images/hi-res/Shades/Shades_3204/749242_th.jpg"],
      ["Swarm Beige", "dwdb77d47c/images/hi-res/SKU/SKU_5942/749245_swatch.jpg", "dw864c53e2/images/hi-res/Shades/Shades_3204/749245_th.jpg"],
      ["Bare Sand", "dw81ee1b03/images/hi-res/SKU/SKU_5942/749244_swatch.jpg", "dw676a8357/images/hi-res/Shades/Shades_3204/749244_th.jpg"],
      ["Midnight Berry", "dw066eaa23/images/hi-res/SKU/SKU_5942/749243_swatch.jpg", "dwed939271/images/hi-res/Shades/Shades_3204/749243_th.jpg"]
    ]
  },
  {
    name: "SoftLine Lip Liner", category: "Makeup", subcategory: "Lip Liner", qar: 98,
    pdp: "softline-lip-liner/P1000211867", sku: "799759",
    image: "dw953ef349/images/hi-res-AE/SKU/SKU_7514/799759_swatch.jpg",
    description: "A creamy lip liner that glides on with up to 6 hours of wear and never feathers. Infused with skincare ingredients to nourish lips while defining their natural shape. Pairs with Flushed Lip Stain, Lip Butter Balm and Dream Lip Oil.",
    shades: [
      ["Sugar", "dw953ef349/images/hi-res-AE/SKU/SKU_7514/799759_swatch.jpg", "dw59737c49/images/hi-res/Shades/Shades_3963/799759_th.jpg"],
      ["Rosé", "dweecb3d09/images/hi-res-AE/SKU/SKU_7514/799760_swatch.jpg", "dwe0d9a335/images/hi-res/Shades/Shades_3963/799760_th.jpg"],
      ["Brownie", "dw34366a56/images/hi-res-AE/SKU/SKU_7514/799384_swatch.jpg", "dw88ebb979/images/hi-res/Shades/Shades_3963/799384_th.jpg"],
      ["Espresso", "dw945e9cc2/images/hi-res-AE/SKU/SKU_7514/799385_swatch.jpg", "dw419db589/images/hi-res/Shades/Shades_3963/799385_th.jpg"],
      ["Toffee", "dw744dc7d0/images/hi-res-AE/SKU/SKU_7514/799386_swatch.jpg", "dwffdc173b/images/hi-res/Shades/Shades_3963/799386_th.jpg"],
      ["Latte", "dw69075acc/images/hi-res-AE/SKU/SKU_7514/799749_swatch.jpg", "dw331e2308/images/hi-res/Shades/Shades_3963/799749_th.jpg"],
      ["Pecan", "dw5d5ac4b9/images/hi-res-AE/SKU/SKU_7514/799750_swatch.jpg", "dw979d5920/images/hi-res/Shades/Shades_3963/799750_th.jpg"],
      ["Cinnamon", "dwd56c537f/images/hi-res-AE/SKU/SKU_7514/799751_swatch.jpg", "dw525fe364/images/hi-res/Shades/Shades_3963/799751_th.jpg"]
    ]
  },

  // ----- Face -----
  {
    name: "Bronzer Butter Balm", category: "Makeup", subcategory: "Bronzer & Contour", qar: 149,
    pdp: "bronzer-butter-balm/P1000213419", sku: "814125",
    image: "dwcf27a50d/images/hi-res-AE/SKU/SKU_7605/814125_swatch.jpg",
    description: "A creamy bronzing balm with a melting texture that warms the complexion with a natural, radiant sun-kissed glow — no shimmer. Buildable for an all-over glow or a defined contour. Sand and Clay suit fair skin, Dune and Desert medium skin, Haze and Sienna deeper skin tones. 5g.",
    shades: [
      ["Sand", "dwcf27a50d/images/hi-res-AE/SKU/SKU_7605/814125_swatch.jpg", "dw6e5723ca/images/hi-res/Shades/Shades_4326/814125_th.jpg"],
      ["Clay", "dwbda09008/images/hi-res-AE/SKU/SKU_7605/814126_swatch.jpg", "dwedb64581/images/hi-res/Shades/Shades_4326/814126_th.jpg"],
      ["Dune", "dwfebe78a4/images/hi-res-AE/SKU/SKU_7605/814127_swatch.jpg", "dwb5838eab/images/hi-res/Shades/Shades_4326/814127_th.jpg"],
      ["Desert", "dwfdb0436e/images/hi-res-AE/SKU/SKU_7605/814128_swatch.jpg", "dwf9437de5/images/hi-res/Shades/Shades_4326/814128_th.jpg"],
      ["Haze", "dw1608cef5/images/hi-res-AE/SKU/SKU_7605/814129_swatch.jpg", "dw52fa0583/images/hi-res/Shades/Shades_4326/814129_th.jpg"],
      ["Sienna", "dw17c60d32/images/hi-res-AE/SKU/SKU_7605/814130_swatch.jpg", "dw6cf2ee69/images/hi-res/Shades/Shades_4326/814130_th.jpg"]
    ]
  },
  {
    name: "Blush Butter Balm", category: "Makeup", subcategory: "Blush", qar: 127,
    pdp: "blush-butter-balm/P1000208528", sku: "771091",
    image: "dwcc542ebb/images/hi-res-AE/SKU/SKU_7603/771091_swatch.jpg",
    description: "Infused with skincare ingredients, this buttery blush blends effortlessly into the skin for a sheer flush of dewy colour.",
    shades: [
      ["Sweet Rosé", "dwcc542ebb/images/hi-res-AE/SKU/SKU_7603/771091_swatch.jpg", "dw5de7fef7/images/hi-res/Shades/Shades_3572/771091_th.jpg"],
      ["Dusty Rose", "dw72476e69/images/hi-res-AE/SKU/SKU_7603/771092_swatch.jpg", "dwf5d7ab98/images/hi-res/Shades/Shades_3572/771092_th.jpg"],
      ["Berry Spritz", "dwbcbc82fd/images/hi-res-AE/SKU/SKU_7603/771093_swatch.jpg", "dwfb288c41/images/hi-res/Shades/Shades_3572/771093_th.jpg"],
      ["Toasted Terracotta", "dw766c44b9/images/hi-res-AE/SKU/SKU_7603/771094_swatch.jpg", "dw70c68213/images/hi-res/Shades/Shades_3572/771094_th.jpg"],
      ["Soft Strawberry", "dw4a9841ff/images/hi-res-AE/SKU/SKU_7603/771095_swatch.jpg", "dwc96a8f21/images/hi-res/Shades/Shades_3572/771095_th.jpg"],
      ["Pink Sunset", "dw288f9aca/images/hi-res-AE/SKU/SKU_7603/771104_swatch.jpg", "dw7022c2fa/images/hi-res/Shades/Shades_3572/771104_th.jpg"]
    ]
  },
  {
    name: "Sheer Skin Tint", category: "Makeup", subcategory: "Foundation", qar: 196,
    pdp: "sheer-skin-tint/P10046169", sku: "654011",
    image: "dw10b7f6ce/images/hi-res/SKU/SKU_3786/654011_swatch.jpg",
    description: "A lightweight skin tint that adds a touch of sheer colour for a more even, healthy look while infusing skin with vitamin-rich hydration. The weightless fluid layers beautifully for sheer-to-light coverage and a natural finish. 30ml.",
    shades: [
      ["Shade 1", "dwdaa9ffba/images/hi-res/SKU/SKU_3784/654008_swatch.jpg", "dwe33817dc/images/hi-res/Shades/Shades_1941/654008_th.jpg"],
      ["Shade 2", "dw08572c5e/images/hi-res/SKU/SKU_3784/654010_swatch.jpg", "dwf960349e/images/hi-res/Shades/Shades_1941/654010_th.jpg"],
      ["Shade 2.5", "dwd1d68f52/images/hi-res/SKU/SKU_5158/718991_swatch.jpg", "dwb7d4103e/images/hi-res/Shades/Shades_2759/718991_th.jpg"],
      ["Shade 3", "dw10b7f6ce/images/hi-res/SKU/SKU_3786/654011_swatch.jpg", "dwb1a1f245/images/hi-res/Shades/Shades_1898/654011_th.jpg"],
      ["Shade 4", "dwd811a36e/images/hi-res/SKU/SKU_3784/654012_swatch.jpg", "dw12c8fc48/images/hi-res/Shades/Shades_1941/654012_th.jpg"],
      ["Shade 4.5", "dwbc7b72a7/images/hi-res/SKU/SKU_5158/718992_swatch.jpg", "dwe4603f46/images/hi-res/Shades/Shades_2759/718992_th.jpg"],
      ["Shade 5", "dw974e001d/images/hi-res/SKU/SKU_3784/654013_swatch.jpg", "dw99e4256c/images/hi-res/Shades/Shades_1941/654013_th.jpg"],
      ["Shade 6", "dw356d9bd4/images/hi-res/SKU/SKU_3784/654014_swatch.jpg", "dw34a8c6f2/images/hi-res/Shades/Shades_1941/654014_th.jpg"],
      ["Shade 7", "dw7e74e88f/images/hi-res/SKU/SKU_3784/654015_swatch.jpg", "dw0d595408/images/hi-res/Shades/Shades_1941/654015_th.jpg"],
      ["Shade 8", "dwb493b883/images/hi-res/SKU/SKU_3784/654016_swatch.jpg", "dw2e1cffae/images/hi-res/Shades/Shades_1941/654016_th.jpg"],
      ["Shade 9", "dw5b66d564/images/hi-res/SKU/SKU_3784/654017_swatch.jpg", "dwfc21eae1/images/hi-res/Shades/Shades_1941/654017_th.jpg"],
      ["Shade 10", "dwc1d0e76e/images/hi-res/SKU/SKU_3784/654009_swatch.jpg", "dw82f51fd0/images/hi-res/Shades/Shades_1941/654009_th.jpg"]
    ]
  },
  {
    name: "The Bronzer Brush", category: "Beauty tools", subcategory: "Brushes & Applicators", qar: 137,
    pdp: "the-bronzer-brush/P1000213536", sku: "814124",
    image: "dw23a60d54/images/hi-res-AE/SKU/SKU_7599/814124_swatch.jpg",
    description: "An angled, ultra-soft brush made for the Bronzer Butter Balm. It follows the natural contours of the face and diffuses product for a light, seamless, buildable finish — all over for a healthy glow or to subtly sculpt cheekbones, jawline and hairline."
  },
  {
    name: "The Blush Brush", category: "Beauty tools", subcategory: "Brushes & Applicators", qar: 137,
    pdp: "the-blush-brush/P1000208529", sku: "771820",
    image: "dw3f5708d9/images/hi-res/SKU/SKU_6455/771820_swatch.jpg",
    description: "An ultra-plush dual-ended cream blush brush for effortless application and blending."
  },

  // ----- Skincare -----
  {
    name: "Jet Lag Mask 28g", category: "Skincare", subcategory: "Masks", qar: 122,
    pdp: "jet-lag-mask/P10018833", sku: "612172",
    image: "dw36f5dad0/images/hi-res/SKU/SKU_5557/612172_swatch.jpg",
    description: "A multi-purpose hydrating cream mask that nourishes, plumps and boosts radiance in minutes. Hyaluronic acid delivers intense moisture while smoothing skin texture. Use as a mask, daily moisturiser, night cream or post-flight rescue. 28g."
  },
  {
    name: "Jet Lag Mask 64g", category: "Skincare", subcategory: "Masks", qar: 232,
    pdp: "jet-lag-mask/P10018833", sku: "557743",
    image: "dwb9542fbf/images/hi-res/SKU/SKU_2546/557743_swatch.jpg",
    description: "A multi-purpose hydrating cream mask that nourishes, plumps and boosts radiance in minutes. Hyaluronic acid delivers intense moisture while smoothing skin texture. Use as a mask, daily moisturiser, night cream or post-flight rescue. 64g."
  },
  {
    name: "Midnight Ritual Retinol Serum", category: "Skincare", subcategory: "Serum", qar: 322,
    pdp: "midnight-ritual-retinol-serum/P10048347", sku: "660723",
    image: "dw49f1ef24/images/hi-res/SKU/SKU_3939/660723_swatch.jpg",
    description: "A highly effective yet gentle overnight serum with vegan retinol/retinyl linoleate, niacinamide and hyaluronic acid to improve tone and texture and diminish the look of fine lines, discolouration and enlarged pores; oatmeal and tiger grass calm the skin. 30ml."
  },
  {
    name: "Summer Silk Nourishing Body Lotion", category: "Skincare", subcategory: "Body & Hand", qar: 133,
    pdp: "summer-silk-nourishing-body-lotion/P10062355", sku: "758021",
    image: "dwc3b9194c/images/hi-res-AE/PID_principal/PID_principal_5000/P10062355_principal.jpg",
    description: "An indulgent body lotion that leaves skin deeply moisturised and powdery-smooth, lightly scented with the signature summer blend of coconut, vanilla blossom and warm almond. 200ml."
  },
  {
    name: "Jet Lag Skin Soothing Hydration Mist", category: "Skincare", subcategory: "Toner & Essence", qar: 103,
    pdp: "jet-lag-skin-soothing-hydration-mist/P10060445", sku: "743029",
    image: "dwa8675364/images/hi-res/PID_principal/PID_principal_4602/P10060445_principal.jpg",
    description: "An ultra-fine mist that soothes, supports the moisture barrier and leaves skin dewy. Works over or under makeup; National Eczema Association Seal of Acceptance™. 50ml."
  },
  {
    name: "Cloud Dew Gel Cream Moisturizer 15ml", category: "Skincare", subcategory: "Moisturiser", qar: 78,
    pdp: "cloud-dew-gel-cream-moisturizer/P1000211780", sku: "799902",
    image: "dw84b73b94/images/hi-res-AE/SKU/SKU_7599/799902_swatch.jpg",
    description: "An updated gel-cream that leaves skin smooth to the touch with a dewy finish — now without pineapple enzyme, so it's gentler for younger or sensitive skin. 15ml."
  },
  {
    name: "Cloud Dew Gel Cream Moisturizer 50ml", category: "Skincare", subcategory: "Moisturiser", qar: 185,
    pdp: "cloud-dew-gel-cream-moisturizer/P1000211780", sku: "799901",
    image: "dw7cfa3fe3/images/hi-res-AE/SKU/SKU_7999/799901_swatch.jpg",
    description: "An updated gel-cream that leaves skin smooth to the touch with a dewy finish — now without pineapple enzyme, so it's gentler for younger or sensitive skin. 50ml."
  },
  {
    name: "Pink Dew Gel Cleanser 150ml", category: "Skincare", subcategory: "Cleanser", qar: 134,
    pdp: "pink-dew-gel-cleanser/P1000211781", sku: "799899",
    image: "dw50e11e43/images/hi-res-AE/PID_principal/PID_principal_5565/P1000211781_principal.jpg",
    description: "A pH-balanced, non-drying foaming gel cleanser that gently removes oil and impurities, leaving skin soft and refreshed. For all skin types, including sensitive, oily and acne-prone. 150ml."
  },
  {
    name: "Pink Dew Gel Cleanser 50ml", category: "Skincare", subcategory: "Cleanser", qar: 73,
    pdp: "pink-dew-gel-cleanser/P1000211781", sku: "799900",
    image: "dw50e11e43/images/hi-res-AE/PID_principal/PID_principal_5565/P1000211781_principal.jpg",
    description: "A pH-balanced, non-drying foaming gel cleanser that gently removes oil and impurities, leaving skin soft and refreshed. For all skin types, including sensitive, oily and acne-prone. 50ml."
  },
  {
    name: "Jet Lag Mask Overnight Eye Serum", category: "Skincare", subcategory: "Eye Care", qar: 223,
    pdp: "jet-lag-mask-overnight-eye-serum/P10057855", sku: "720345",
    image: "dw9afec330/images/hi-res/PID_principal/PID_principal_4413/P10057855_principal.jpg",
    description: "A lightweight overnight eye serum that smooths fine lines, reduces the look of dark circles and helps firm the delicate eye area, with glycerin, a gentle retinoid blend, ceramides and licorice extract. 15ml."
  },
  {
    name: "Light Aura Vitamin C + Peptide Eye Cream", category: "Skincare", subcategory: "Eye Care", qar: 214,
    pdp: "light-aura-vitamin-c-peptide-eye-cream/P10024589", sku: "587330",
    image: "dw65f4ec2e/images/hi-res/SKU/SKU_3121/587330_swatch.jpg",
    description: "A multitasking eye cream with a vitamin C and peptide blend that visibly brightens the eye area and supports natural collagen for a firmer, smoother look. Caffeine de-puffs, allantoin and vitamin E soothe, and soft optics illuminate all skin tones. 15ml."
  },
  {
    name: "CC Me Serum", category: "Skincare", subcategory: "Serum", qar: 321,
    pdp: "cc-me-serum/P10010197", sku: "528354",
    image: "dw078849d2/images/hi-res/SKU/SKU_528/528354_swatch.jpg",
    description: "A brightening serum with two forms of vitamin C for instant radiance and fewer visible dark spots, squalane to lock in moisture and clinically proven peptides for youthful-looking skin. Vegan. 30ml."
  },
  {
    name: "Jet Lag Deep Hydration Serum", category: "Skincare", subcategory: "Serum", qar: 214,
    pdp: "jet-lag-deep-hydration-serum/P1000203660", sku: "744337",
    image: "dw71234f5e/images/hi-res/PID_principal/PID_principal_4602/P1000203660_principal.jpg",
    description: "A lightweight jelly-serum (formerly Dream Oasis) that absorbs instantly to drench skin in hydration, soothe dryness and boost suppleness, with squalane, glycerin and hyaluronic acid. 30ml."
  },

  // ----- Fragrance -----
  {
    name: "Sunlit Vanilla Eau de Parfum 50ml", category: "Fragrance", subcategory: "Eau de Parfum", qar: 378,
    pdp: "sunlit-vanilla-eau-de-parfum/P1000212445", sku: "804926",
    image: "dw0717cef2/images/hi-res/SKU/SKU_7378/804926_swatch.jpg",
    description: "A gourmand, sun-kissed vanilla inspired by gelato in Saint-Tropez: sparkling bergamot opens to caramel and coconut over vanilla, tonka bean, creamy musk and amber. 20% fragrance oils for 8+ hours of wear. 50ml."
  },
  {
    name: "Sunlit Vanilla Eau de Parfum 10ml", category: "Fragrance", subcategory: "Eau de Parfum", qar: 138,
    pdp: "sunlit-vanilla-eau-de-parfum/P1000212445", sku: "804927",
    image: "dwc63da6c8/images/hi-res/SKU/SKU_7378/804927_swatch.jpg",
    description: "A gourmand, sun-kissed vanilla inspired by gelato in Saint-Tropez: sparkling bergamot opens to caramel and coconut over vanilla, tonka bean, creamy musk and amber. 20% fragrance oils for 8+ hours of wear. 10ml travel size."
  }
];

// Body mist / butter: one product per scent × size.
const MIST_DESC = "A lightweight body mist inspired by the bestselling Lip Butter Balm that perfumes skin in one effortless spray, with a fine, airy, non-sticky texture. Layer scents to create your own combination.";
const BUTTER_DESC = "A rich, indulgent body moisturiser with shea, murumuru and illipe butters, hyaluronic acid, vitamin E and a soothing oat/jojoba/squalane complex. Absorbs instantly for hydrated, radiant skin with no greasy residue.";
const SCENTS: Array<{ scent: string; mist: Record<string, [string, string]>; butter: Record<string, [string, string]> }> = [
  {
    scent: "Vanilla",
    mist: { "90ml": ["820935", "dwbf1a5619/images/hi-res/SKU/SKU_7597/820935_swatch.jpeg"], "240ml": ["820934", "dw8a5eb391/images/hi-res/SKU/SKU_7597/820934_swatch.jpeg"] },
    butter: { "60ml": ["820929", "dw50a22c09/images/hi-res/SKU/SKU_7746/820929_swatch.jpg"], "200ml": ["820928", "dwb8eb3d52/images/hi-res/SKU/SKU_7746/820928_swatch.jpg"] }
  },
  {
    scent: "Pink Guava",
    mist: { "90ml": ["820937", "dw61ddd567/images/hi-res/SKU/SKU_7601/820937_swatch.jpeg"], "240ml": ["820936", "dw529494cc/images/hi-res/SKU/SKU_7598/820936_swatch.jpeg"] },
    butter: { "60ml": ["820931", "dwe6b1bda0/images/hi-res/SKU/SKU_7746/820931_swatch.jpg"], "200ml": ["820930", "dwc8b2059f/images/hi-res/SKU/SKU_7746/820930_swatch.jpg"] }
  },
  {
    scent: "Pistachio Milk",
    mist: { "90ml": ["820939", "dw33f75057/images/hi-res/SKU/SKU_7598/820939_swatch.jpeg"], "240ml": ["820938", "dw2b3ccfc0/images/hi-res/SKU/SKU_7598/820938_swatch.jpeg"] },
    butter: { "60ml": ["820933", "dw2dbf93ec/images/hi-res/SKU/SKU_7746/820933_swatch.jpg"], "200ml": ["820932", "dw1c1d388b/images/hi-res/SKU/SKU_7746/820932_swatch.jpg"] }
  }
];
const MIST_QAR: Record<string, number> = { "90ml": 117, "240ml": 185 };
const BUTTER_QAR: Record<string, number> = { "60ml": 88, "200ml": 156 };
for (const s of SCENTS) {
  for (const [size, [sku, img]] of Object.entries(s.mist)) {
    PRODUCTS.push({
      name: `Body Fragrance Mist ${s.scent} ${size}`, category: "Fragrance", subcategory: "Hair & Body Mist", qar: MIST_QAR[size],
      pdp: "body-fragrance-mist/P1000214409", sku, image: img, description: `${MIST_DESC} Scent: ${s.scent}. ${size}.`
    });
  }
  for (const [size, [sku, img]] of Object.entries(s.butter)) {
    PRODUCTS.push({
      name: `Body Butter Balm ${s.scent} ${size}`, category: "Skincare", subcategory: "Body & Hand", qar: BUTTER_QAR[size],
      pdp: "body-butter-balm/P1000214410", sku, image: img, description: `${BUTTER_DESC} Scent: ${s.scent}. ${size}.`
    });
  }
}

async function download(path: string, dest: string, width: number): Promise<boolean> {
  if (existsSync(dest)) return true;
  try {
    const res = await fetch(`${CDN}${path}?sw=${width}&sm=fit&q=88`, { headers: { "User-Agent": UA, Referer: "https://www.sephora.me/" } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    // Flat colour swatches compress to a few hundred bytes; pack shots never do.
    if (buf.length < (width <= 120 ? 100 : 500)) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const sql = getSql();
  const pub = resolve(process.cwd(), "public", DIR);
  mkdirSync(pub, { recursive: true });
  const failures: string[] = [];

  for (const p of PRODUCTS) {
    const pslug = slug(p.name);
    const priceUsd = round2(p.qar / 3.645 + (p.set ? 13 : 8));
    const priceGbp = round2(priceUsd / 1.35);
    const productUrl = `${PDP}${p.pdp}?productVariantId=${p.sku}`;

    const mainFile = `${pslug}.jpg`;
    if (!(await download(p.image, resolve(pub, mainFile), 1320))) {
      failures.push(`${p.name}: main image`);
      continue;
    }
    const mainUrl = `/${DIR}/${mainFile}`;

    const shades: Array<{ name: string; image: string; swatch: string }> = [];
    for (const [name, img, sw] of p.shades ?? []) {
      const f = `${pslug}-${slug(name)}.jpg`;
      const fs = `${pslug}-${slug(name)}-swatch.jpg`;
      const okImg = await download(img, resolve(pub, f), 1320);
      const okSw = await download(sw, resolve(pub, fs), 96);
      if (!okImg) failures.push(`${p.name} / ${name}: shade image`);
      if (!okSw) failures.push(`${p.name} / ${name}: swatch`);
      shades.push({ name, image: okImg ? `/${DIR}/${f}` : mainUrl, swatch: okSw ? `/${DIR}/${fs}` : okImg ? `/${DIR}/${f}` : mainUrl });
    }

    let id: string;
    if (p.name === "Flushed Lip Stain") {
      await sql`
        update products set description = ${p.description}, price_usd = ${priceUsd}, price_gbp = ${priceGbp},
          price_locked = true, product_url = coalesce(product_url, ${productUrl})
        where id = ${EXISTING_FLUSHED_LIP_STAIN}
      `;
      id = EXISTING_FLUSHED_LIP_STAIN;
    } else {
      const rows = (await sql`
        insert into products (brand, name, category, subcategory, description, price_gbp, price_usd,
                              product_url, image_url, price_locked, deliverable_lebanon)
        values ('Summer Fridays', ${p.name}, ${p.category}, ${p.subcategory}, ${p.description}, ${priceGbp}, ${priceUsd},
                ${productUrl}, ${mainUrl}, true, true)
        on conflict (product_url) do update set
          name = excluded.name, category = excluded.category, subcategory = excluded.subcategory,
          description = excluded.description, price_gbp = excluded.price_gbp, price_usd = excluded.price_usd,
          image_url = excluded.image_url, price_locked = true
        returning id
      `) as Array<{ id: string }>;
      id = rows[0].id;
    }

    for (let i = 0; i < shades.length; i++) {
      const s = shades[i];
      await sql`
        insert into product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
        values (${id}, ${s.name}, ${s.image}, ${s.swatch}, ${(i + 1) * 10})
        on conflict (product_id, shade_name) do update set
          shade_image_url = excluded.shade_image_url, swatch_url = excluded.swatch_url, sort_order = excluded.sort_order
      `;
    }
    if (shades.length) await sql`update products set variants_checked_at = now() where id = ${id}`;
    console.log(`OK  ${p.name.padEnd(42)} QAR ${String(p.qar).padStart(3)} → $${priceUsd}${p.set ? " (set)" : ""}${shades.length ? `, ${shades.length} shades` : ""}`);
  }

  console.log(`\n${PRODUCTS.length} products processed; ${failures.length} image failures`);
  for (const f of failures) console.log("  FAIL " + f);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
