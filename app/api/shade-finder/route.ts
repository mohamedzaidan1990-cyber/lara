import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  type ShadeFinderInput,
  type BespokeRec,
  type Undertone,
  type Coverage,
  type SkinType,
  type Finish,
  scoreProduct,
  describeSkinTone,
  coverageLabel,
  finishLabel,
  fallbackBespoke
} from "@/lib/shades";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface CatalogMatch {
  id: string;
  brand: string;
  name: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  matchPercent: number;
}

const UNDERTONES: Undertone[] = ["cool", "neutral", "warm"];
const COVERAGES: Coverage[] = ["light", "medium", "full"];
const SKIN_TYPES: SkinType[] = ["dry", "normal", "oily", "combination"];
const FINISHES: Finish[] = ["dewy", "natural", "matte"];

function sanitize(body: Record<string, unknown>): ShadeFinderInput {
  const hex = typeof body.skinToneHex === "string" && /^#?[0-9a-f]{6}$/i.test(body.skinToneHex) ? body.skinToneHex : "#C96A3A";
  const undertone = UNDERTONES.includes(body.undertone as Undertone) ? (body.undertone as Undertone) : "neutral";
  const coverage = COVERAGES.includes(body.coverage as Coverage) ? (body.coverage as Coverage) : "medium";
  const skinType = SKIN_TYPES.includes(body.skinType as SkinType) ? (body.skinType as SkinType) : "normal";
  const finish = FINISHES.includes(body.finish as Finish) ? (body.finish as Finish) : "natural";
  return { skinToneHex: hex.startsWith("#") ? hex : `#${hex}`, undertone, coverage, skinType, finish };
}

interface ProductRow {
  id: string;
  brand: string;
  name: string;
  price_gbp: string | number;
  price_usd: string | number;
  deliverable_lebanon: boolean;
  product_url: string | null;
  image_url: string | null;
}

async function catalogMatches(input: ShadeFinderInput): Promise<CatalogMatch[]> {
  const sql = getSql();
  let rows: ProductRow[] = [];
  try {
    rows = (await sql`
      select id, brand, name, price_gbp::float8 as price_gbp, price_usd::float8 as price_usd,
             deliverable_lebanon, product_url, image_url
      from products
      where category = 'Makeup'
        and (
          lower(name) like '%foundation%' or lower(name) like '%concealer%' or
          lower(name) like '%tint%' or lower(name) like '%coverage%' or
          lower(name) like '%powder%' or lower(name) like '%bb%' or
          lower(name) like '%cc%' or lower(name) like '%cushion%' or
          lower(name) like '%complexion%' or lower(name) like '%skin%'
        )
    `) as ProductRow[];
  } catch {
    return [];
  }

  return rows
    .map((r) => ({
      id: r.id,
      brand: r.brand,
      name: r.name,
      price_gbp: Number(r.price_gbp) || 0,
      price_usd: Number(r.price_usd) || 0,
      deliverable_lebanon: r.deliverable_lebanon,
      product_url: r.product_url ?? "",
      image_url: r.image_url ?? "",
      matchPercent: scoreProduct(r.brand, r.name, input)
    }))
    .sort((a, b) => b.matchPercent - a.matchPercent || a.price_usd - b.price_usd)
    .slice(0, 6);
}

const SYSTEM_PROMPT =
  "You are a luxury beauty shade-matching expert for a London personal-shopping boutique. " +
  "You recommend specific foundation and concealer products with exact, real shade names from prestige brands " +
  "(Charlotte Tilbury, NARS, Dior, Armani Beauty, La Mer, Sisley, Hourglass, Westman Atelier, Estée Lauder). " +
  "Always respond with ONLY a valid JSON array, no prose, no markdown fences.";

function userPrompt(input: ShadeFinderInput): string {
  return [
    "Customer profile:",
    `- Skin tone: ${input.skinToneHex} (${describeSkinTone(input.skinToneHex)})`,
    `- Undertone: ${input.undertone}`,
    `- Coverage preference: ${coverageLabel(input.coverage)}`,
    `- Skin type: ${input.skinType}`,
    `- Finish preference: ${finishLabel(input.finish)}`,
    "",
    "Recommend exactly 4 foundation or concealer products with exact shade names that suit this profile.",
    'Return ONLY a JSON array of objects with keys: "brand", "productName", "shadeName", "shadeDescription", "priceRange", "whyItWorks".'
  ].join("\n");
}

// Extract the first balanced JSON array from arbitrary text.
function extractJsonArray(text: string): unknown[] | null {
  const open = text.indexOf("[");
  if (open < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(open, i + 1)) as unknown[];
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeRec(raw: unknown): BespokeRec | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const brand = str(o.brand);
  const productName = str(o.productName ?? o.product_name ?? o.product);
  if (!brand || !productName) return null;
  return {
    brand,
    productName,
    shadeName: str(o.shadeName ?? o.shade ?? o.shade_name),
    shadeDescription: str(o.shadeDescription ?? o.shade_description),
    priceRange: str(o.priceRange ?? o.price_range) || "£40–£55",
    whyItWorks: str(o.whyItWorks ?? o.why ?? o.reason)
  };
}

async function bespokeRecommendations(input: ShadeFinderInput): Promise<BespokeRec[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[shade-finder] ANTHROPIC_API_KEY not set — using rule-based fallback");
    return fallbackBespoke(input);
  }
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        // Static system prompt → cache it across requests for cheaper calls.
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt(input) }]
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[shade-finder] Anthropic HTTP ${res.status} (model=${model}) ${detail.slice(0, 200)}`);
      return fallbackBespoke(input);
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const arr = extractJsonArray(text);
    if (!arr) {
      console.warn("[shade-finder] Anthropic returned unparseable content — using fallback");
      return fallbackBespoke(input);
    }
    const recs = arr.map(normalizeRec).filter((r): r is BespokeRec => r !== null).slice(0, 4);
    if (recs.length === 0) {
      console.warn("[shade-finder] Anthropic returned no usable recs — using fallback");
      return fallbackBespoke(input);
    }
    console.log(`[shade-finder] Anthropic OK (model=${model}) → ${recs.length} recs`);
    return recs;
  } catch (err) {
    console.warn(`[shade-finder] Anthropic call failed: ${(err as Error).message}`);
    return fallbackBespoke(input);
  }
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = sanitize(body);

  const [catalog, bespoke] = await Promise.all([catalogMatches(input), bespokeRecommendations(input)]);

  return NextResponse.json({
    input,
    skinToneDescription: describeSkinTone(input.skinToneHex),
    catalogMatches: catalog,
    bespokeRecommendations: bespoke
  });
}
