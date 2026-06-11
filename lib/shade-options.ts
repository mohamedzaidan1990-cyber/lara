// Shade/colour options for a product, scraped on demand from the product's
// Selfridges PDP and cached on the products row (shades jsonb +
// shades_checked_at). The PDP flight payload exposes:
//   "colours":[{"name":"0.5n","swatch":"R03895098_0.5N_SW"}, …]

export interface ShadeOption {
  name: string;
  // Scene7 swatch image URL ("" when Selfridges has no swatch image).
  swatch_url: string;
}

// Subcategories where a shade/colour choice matters. Complexion ones also get
// the Shade Finder prompt.
export const COMPLEXION_SUBCATEGORIES = new Set(["Foundation", "Concealer", "Primer", "Powder"]);

export const SHADE_RELEVANT_SUBCATEGORIES = new Set([
  ...COMPLEXION_SUBCATEGORIES,
  "Blush",
  "Bronzer & Contour",
  "Highlighter",
  "Setting Spray",
  "Lipstick",
  "Lip Gloss & Oil",
  "Lip Liner",
  "Lip Care",
  "Mascara",
  "Eyeliner",
  "Eyeshadow",
  "Brows",
  "Nails",
  "Palettes"
]);

export function isShadeRelevant(subcategory: string | null, name: string): boolean {
  if (subcategory && SHADE_RELEVANT_SUBCATEGORIES.has(subcategory)) return true;
  return /foundation|concealer|tint|bb cream|cc cream|cushion|complexion|lipstick|lip gloss|nail/i.test(name);
}

// Selfridges stores shade names lowercased ("0.5n", "modern love"). Title-case
// words; fully uppercase code-like tokens that mix digits and letters ("1.5n"
// → "1.5N", "0w 3" → "0W 3").
export function formatShadeName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

// Pull the colours array out of the (possibly backslash-escaped) PDP flight
// payload with a balanced-bracket scan.
export function extractShadeOptions(html: string): ShadeOption[] {
  for (const marker of ['\\"colours\\":[', '"colours":[']) {
    const at = html.indexOf(marker);
    if (at < 0) continue;
    const start = at + marker.length - 1; // position of '['
    let depth = 0;
    for (let i = start; i < html.length && i < start + 200_000; i += 1) {
      if (html[i] === "[") depth += 1;
      else if (html[i] === "]") {
        depth -= 1;
        if (depth === 0) {
          const rawJson = html.slice(start, i + 1).replace(/\\"/g, '"');
          try {
            const arr = JSON.parse(rawJson) as Array<{ name?: string; swatch?: string }>;
            return arr
              .filter((c) => typeof c?.name === "string" && c.name.trim().length > 0)
              .map((c) => ({
                name: formatShadeName(c.name as string),
                swatch_url:
                  typeof c.swatch === "string" && c.swatch
                    ? `https://images.selfridges.com/is/image/selfridges/${c.swatch}?wid=64&hei=64&fmt=webp&qlt=80`
                    : ""
              }));
          } catch {
            return [];
          }
        }
      }
    }
  }
  return [];
}
