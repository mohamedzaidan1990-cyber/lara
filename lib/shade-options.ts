// Shade/colour options for a product, scraped on demand from the product's
// Selfridges PDP and cached on the products row (shades jsonb +
// shades_checked_at). The PDP flight payload exposes:
//   "colours":[{"name":"0.5n","swatch":"R03895098_0.5N_SW"}, …]

export interface ShadeOption {
  name: string;
  // Scene7 swatch image URL ("" when Selfridges has no swatch image).
  swatch_url: string;
  // Full per-shade product image (Scene7 _M variant); "" if no swatch slug.
  image_url: string;
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

// Lightness score for a shade name — lower = lighter. Used to sort shade
// pickers so lighter shades (more popular with Middle East clients) appear first.
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

export function shadeScore(name: string): number {
  const lower = name.toLowerCase();
  // Numeric codes like "1N", "0.5N", "2W" — lower number means lighter
  const numMatch = lower.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]) * 3;
  for (const [keyword, score] of LIGHT_SCORES) {
    if (lower.includes(keyword)) return score;
  }
  return 30; // unlabelled shades go in the middle
}

export function sortShadesLightFirst(shades: ShadeOption[]): ShadeOption[] {
  return [...shades].sort((a, b) => shadeScore(a.name) - shadeScore(b.name));
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
              .map((c) => {
                const swatchSlug = typeof c.swatch === "string" && c.swatch ? c.swatch : "";
                const imageSlug = swatchSlug ? swatchSlug.replace(/_SW$/i, "_M") : "";
                return {
                  name: formatShadeName(c.name as string),
                  swatch_url: swatchSlug
                    ? `https://images.selfridges.com/is/image/selfridges/${swatchSlug}?wid=64&hei=64&fmt=webp&qlt=80`
                    : "",
                  image_url: imageSlug
                    ? `https://images.selfridges.com/is/image/selfridges/${imageSlug}?wid=960&hei=1280&fmt=webp&qlt=80`
                    : ""
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
