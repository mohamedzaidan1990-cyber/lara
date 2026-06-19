import { getPool } from "./db";

const OXYLABS_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

const SHADE_RELEVANT_SUBCATEGORIES = [
  "Foundation", "Concealer", "Primer", "Powder", "Blush", "Bronzer & Contour",
  "Highlighter", "Setting Spray", "Lipstick", "Lip Gloss & Oil", "Lip Liner",
  "Lip Care", "Mascara", "Eyeliner", "Eyeshadow", "Brows", "Nails", "Palettes"
];

const SHADE_NAME_REGEX =
  "foundation|concealer|tint|bb cream|cc cream|cushion|complexion|lipstick|lip gloss|nail";

const LIGHT_SCORES: Array<[string, number]> = [
  ["ivory", 1], ["porcelain", 2], ["alabaster", 3], ["pearl", 4], ["shell", 5],
  ["fair", 6], ["light", 7], ["pale", 8], ["vanilla", 9], ["cream", 10],
  ["nude", 15], ["natural", 16], ["beige", 17], ["sand", 18], ["champagne", 19],
  ["opal", 20], ["linen", 21], ["wheat", 22],
  ["warm", 25], ["golden", 26], ["honey", 27], ["caramel", 28],
  ["tan", 35], ["medium", 36], ["tawny", 37],
  ["deep", 50], ["dark", 51], ["rich", 52], ["mocha", 53], ["coffee", 54],
  ["walnut", 55], ["chocolate", 56], ["chestnut", 57], ["mahogany", 58],
  ["espresso", 59], ["truffle", 60], ["umber", 61], ["cocoa", 62],
  ["ebony", 63], ["midnight", 64], ["noir", 65], ["black", 66], ["onyx", 67],
];

function shadeScore(name: string): number {
  const lower = name.toLowerCase();
  const numMatch = lower.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]) * 3;
  for (const [keyword, score] of LIGHT_SCORES) {
    if (lower.includes(keyword)) return score;
  }
  return 30;
}

function formatShadeName(raw: string): string {
  return raw.trim().split(/\s+/).map((w) =>
    /\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
}

interface ExtractedShade {
  name: string;
  swatch_url: string;
  image_url: string;
  sort_order: number;
}

function extractShades(html: string): ExtractedShade[] {
  for (const marker of ['\\"colours\\":[', '"colours":[']) {
    const at = html.indexOf(marker);
    if (at < 0) continue;
    const start = at + marker.length - 1;
    let depth = 0;
    for (let i = start; i < html.length && i < start + 200_000; i++) {
      if (html[i] === "[") depth++;
      else if (html[i] === "]") {
        depth--;
        if (depth === 0) {
          const rawJson = html.slice(start, i + 1).replace(/\\"/g, '"');
          try {
            const arr = JSON.parse(rawJson) as Array<{ name?: string; swatch?: string }>;
            return arr
              .filter((c) => typeof c?.name === "string" && c.name.trim().length > 0)
              .map((c) => {
                const name = formatShadeName(c.name as string);
                const swatchSlug = typeof c.swatch === "string" && c.swatch ? c.swatch : "";
                const imageSlug = swatchSlug ? swatchSlug.replace(/_SW$/i, "_M") : "";
                return {
                  name,
                  swatch_url: swatchSlug
                    ? `https://images.selfridges.com/is/image/selfridges/${swatchSlug}?wid=64&hei=64&fmt=webp&qlt=80`
                    : "",
                  image_url: imageSlug
                    ? `https://images.selfridges.com/is/image/selfridges/${imageSlug}?wid=960&hei=1280&fmt=webp&qlt=80`
                    : "",
                  sort_order: shadeScore(name),
                };
              });
          } catch {
            return [];
          }
        }
      }
    }
  }
  return [];
}

async function fetchPdpHtml(url: string): Promise<string> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) return "";
  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  try {
    const res = await fetch(OXYLABS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ source: "universal", url, render: "html", geo_location: "United Kingdom" }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { results?: Array<{ content?: string }> };
    return data.results?.[0]?.content ?? "";
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runVariantEnrichment(): Promise<void> {
  const user = process.env.OXYLABS_USERNAME;
  const pass = process.env.OXYLABS_PASSWORD;
  if (!user || !pass) {
    console.log("[enricher] Oxylabs creds missing — skipping variant enrichment");
    return;
  }

  const batchSize = parseInt(process.env.VARIANT_BATCH_SIZE ?? "50", 10);
  const pool = getPool();

  const { rows: products } = await pool.query<{ id: string; product_url: string }>(
    `SELECT id, product_url FROM products
     WHERE product_url LIKE '%selfridges.com%'
       AND (variants_checked_at IS NULL OR variants_checked_at < NOW() - INTERVAL '7 days')
       AND (subcategory = ANY($1) OR name ~* $2)
     ORDER BY COALESCE(variants_checked_at, '1970-01-01'::timestamp) ASC
     LIMIT $3`,
    [SHADE_RELEVANT_SUBCATEGORIES, SHADE_NAME_REGEX, batchSize]
  );

  if (products.length === 0) {
    console.log("[enricher] No products need variant enrichment");
    return;
  }

  console.log(`[enricher] Enriching ${products.length} products`);
  let enriched = 0;

  for (const product of products) {
    // Always mark checked_at BEFORE the fetch so a failed fetch won't retry every run.
    await pool.query(
      `UPDATE products SET variants_checked_at = NOW() WHERE id = $1`,
      [product.id]
    );

    const html = await fetchPdpHtml(product.product_url);
    if (!html) {
      console.log(`[enricher] PDP fetch failed: ${product.product_url}`);
      await sleep(2000);
      continue;
    }

    const shades = extractShades(html);
    if (shades.length === 0) {
      await sleep(2000);
      continue;
    }

    for (const shade of shades) {
      await pool.query(
        `INSERT INTO product_variants (product_id, shade_name, shade_image_url, swatch_url, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_id, shade_name) DO UPDATE SET
           shade_image_url = EXCLUDED.shade_image_url,
           swatch_url = EXCLUDED.swatch_url,
           sort_order = EXCLUDED.sort_order`,
        [product.id, shade.name, shade.image_url || null, shade.swatch_url || null, shade.sort_order]
      );
    }

    // Set light_shade_image_url to the lightest shade that has an image.
    await pool.query(
      `UPDATE products
       SET light_shade_image_url = (
         SELECT shade_image_url FROM product_variants
         WHERE product_id = $1
           AND shade_image_url IS NOT NULL AND shade_image_url <> ''
         ORDER BY sort_order ASC LIMIT 1
       )
       WHERE id = $1`,
      [product.id]
    );

    enriched++;
    console.log(`[enricher] ${product.product_url} → ${shades.length} shades`);
    await sleep(2000);
  }

  console.log(`[enricher] Done — enriched ${enriched}/${products.length} products`);
}
