// Shared logic for the Shade Finder — used by both the client UI and the
// /api/shade-finder route. No runtime dependencies (safe on client & server).

export type Undertone = "cool" | "neutral" | "warm";
export type Coverage = "light" | "medium" | "full";
export type SkinType = "dry" | "normal" | "oily" | "combination";
export type Finish = "dewy" | "natural" | "matte";

export interface ShadeFinderInput {
  skinToneHex: string;
  undertone: Undertone;
  coverage: Coverage;
  skinType: SkinType;
  finish: Finish;
}

export interface BespokeRec {
  brand: string;
  productName: string;
  shadeName: string;
  shadeDescription: string;
  priceRange: string;
  whyItWorks: string;
}

// 24 swatches, fairest → deepest, in 4 rows of 6.
export const SWATCH_ROWS: ReadonlyArray<{ label: string; hexes: string[] }> = [
  { label: "Fair", hexes: ["#FDDBB4", "#F9C99A", "#F5B880", "#EFA96A", "#E89A55", "#E08B45"] },
  { label: "Light–Medium", hexes: ["#D4784A", "#C96A3A", "#BE5C2E", "#B05025", "#A0451E", "#8F3A18"] },
  { label: "Medium–Tan", hexes: ["#7D3015", "#6E2810", "#60200C", "#8B4513", "#7A3B0F", "#6B320C"] },
  { label: "Deep", hexes: ["#5C2A09", "#4E2207", "#3E1A05", "#2F1203", "#200C02", "#140801"] }
];

export const SHADE_SWATCHES: string[] = SWATCH_ROWS.flatMap((r) => r.hexes);

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 150, g: 100, b: 70 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b; // 0–255
}

// Per-row labels (half-row granularity) so the description matches the swatch
// the customer actually picked.
const ROW_LABELS: string[][] = [
  ["fair", "fair to light"],
  ["light to medium", "medium"],
  ["medium to tan", "tan"],
  ["deep", "rich deep"]
];

// Human-readable depth, e.g. "medium to tan". Uses the picked swatch's row when
// the hex is one of our swatches; otherwise falls back to luminance.
export function describeSkinTone(hex: string): string {
  const norm = (hex.startsWith("#") ? hex : `#${hex}`).toUpperCase();
  const idx = SHADE_SWATCHES.findIndex((s) => s.toUpperCase() === norm);
  if (idx >= 0) {
    const row = Math.floor(idx / 6);
    const half = idx % 6 < 3 ? 0 : 1;
    return ROW_LABELS[row][half];
  }
  const lum = luminance(hex);
  if (lum >= 200) return "fair";
  if (lum >= 168) return "fair to light";
  if (lum >= 138) return "light";
  if (lum >= 110) return "light to medium";
  if (lum >= 84) return "medium";
  if (lum >= 60) return "medium to tan";
  if (lum >= 38) return "tan";
  if (lum >= 22) return "deep";
  return "rich deep";
}

// 1 (fairest) … 16 (deepest) — used for plausible fallback shade numbering.
export function depthIndex(hex: string): number {
  const lum = luminance(hex);
  const idx = Math.round(((255 - lum) / 255) * 15) + 1;
  return Math.max(1, Math.min(16, idx));
}

export function undertoneLetter(u: Undertone): string {
  return u === "cool" ? "C" : u === "warm" ? "W" : "N";
}

const COVERAGE_LABEL: Record<Coverage, string> = {
  light: "light, skin-like",
  medium: "medium, buildable",
  full: "full, flawless"
};
const FINISH_LABEL: Record<Finish, string> = {
  dewy: "dewy & luminous",
  natural: "natural & satin",
  matte: "matte & shine-free"
};
export function coverageLabel(c: Coverage): string {
  return COVERAGE_LABEL[c];
}
export function finishLabel(f: Finish): string {
  return FINISH_LABEL[f];
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

// Score a catalog product (40–99) against the user's preferences.
export function scoreProduct(brand: string, name: string, input: ShadeFinderInput): number {
  const text = `${brand} ${name}`.toLowerCase();
  let score = 30;

  const fullKw = ["full coverage", "longwear", "long-wear", "long wear", "double wear", "all hours", "forever", "stay"];
  const lightKw = ["skin tint", "tinted moistur", "serum foundation", "sheer", "bb cream", "cc cream", " bb", " cc", "glow tint", "light"];
  const mediumKw = ["medium", "natural", "buildable", "skin foundation", "flawless filter", "beautiful skin", "complexion"];
  const fullBrands = ["nars", "estée lauder", "estee lauder", "make up for ever", "huda", "lancôme", "lancome"];
  const lightBrands = ["ilia", "glossier", "kosas", "saie", "merit"];

  if (input.coverage === "full" && (includesAny(text, fullKw) || includesAny(text, fullBrands))) score += 30;
  else if (input.coverage === "light" && (includesAny(text, lightKw) || includesAny(text, lightBrands))) score += 30;
  else if (input.coverage === "medium" && includesAny(text, mediumKw)) score += 30;
  else score += 12;

  const dewyKw = ["dewy", "luminous", "radiant", "glow", "sheer glow", "hydrating", "skin tint", "light wand"];
  const matteKw = ["matte", "oil control", "shine", "longwear", "velvet", "poreless", "mattifying", "long wear"];
  const dewyBrands = ["charlotte tilbury", "nars", "westman atelier", "hourglass", "ilia"];

  if (input.finish === "dewy" && (includesAny(text, dewyKw) || includesAny(text, dewyBrands))) score += 20;
  else if (input.finish === "matte" && includesAny(text, matteKw)) score += 20;
  else if (input.finish === "natural") score += 14;
  else score += 8;

  const hydrating = ["hydrating", "dewy", "glow", "luminous", "serum", "moistur", "radiant"];
  const mattifying = ["matte", "oil control", "longwear", "poreless", "shine", "long wear"];

  if (input.skinType === "dry" && includesAny(text, hydrating)) score += 20;
  else if (input.skinType === "oily" && includesAny(text, mattifying)) score += 20;
  else if (input.skinType === "combination" && (includesAny(text, mattifying) || includesAny(text, ["natural", "satin", "buildable"]))) score += 14;
  else if (input.skinType === "normal") score += 14;
  else score += 8;

  return Math.max(40, Math.min(99, score));
}

// Deterministic, rule-based bespoke recommendations — used when the Claude API
// key is absent or the call fails. Shade names are plausible (depth + undertone).
export function fallbackBespoke(input: ShadeFinderInput): BespokeRec[] {
  const depth = depthIndex(input.skinToneHex); // 1..16
  const u = undertoneLetter(input.undertone);
  const desc = describeSkinTone(input.skinToneHex);
  const num = Math.max(1, Math.round(depth * 0.95));

  return [
    {
      brand: "Charlotte Tilbury",
      productName: "Airbrush Flawless Foundation",
      shadeName: `${num} ${input.undertone === "warm" ? "Warm" : input.undertone === "cool" ? "Cool" : "Neutral"}`,
      shadeDescription: `A ${desc} shade with ${input.undertone} undertones`,
      priceRange: "£38–£42",
      whyItWorks: `Buildable ${coverageLabel(input.coverage)} coverage with a ${finishLabel(input.finish)} finish that flatters ${desc} skin.`
    },
    {
      brand: "NARS",
      productName: input.finish === "matte" ? "Light Reflecting Foundation" : "Sheer Glow Foundation",
      shadeName: `${depth}${u}`,
      shadeDescription: `${desc.charAt(0).toUpperCase() + desc.slice(1)} with a ${input.undertone} balance`,
      priceRange: "£40–£45",
      whyItWorks: `A cult complexion base praised for ${input.finish === "matte" ? "a smooth, balanced" : "a radiant"} finish on ${input.skinType} skin.`
    },
    {
      brand: "Estée Lauder",
      productName: "Double Wear Stay-in-Place Foundation",
      shadeName: `${depth}${u}1`,
      shadeDescription: `Long-wearing ${desc} match`,
      priceRange: "£40–£44",
      whyItWorks: `Full, transfer-resistant coverage — ideal if you want flawless, long-lasting wear for ${input.skinType} skin.`
    },
    {
      brand: "Hourglass",
      productName: "Vanish Seamless Finish Foundation Stick",
      shadeName: `${desc.split(" ")[0].charAt(0).toUpperCase() + desc.split(" ")[0].slice(1)} ${u}`,
      shadeDescription: `Concentrated ${desc} pigment`,
      priceRange: "£54–£58",
      whyItWorks: `A modern, ${finishLabel(input.finish)} stick that melts in for a second-skin look.`
    }
  ];
}
