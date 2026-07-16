import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { normalizedHaystackSql } from "@/lib/search";
import { sendBespokeAlert } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Béa, the shopping assistant for Seasons by B — a luxury beauty boutique that delivers London's finest to your door. You know the catalogue like a knowledgeable in-store sales associate, not a search box.

Style: warm, sharp and concise — short sentences, no filler, but don't undersell the options you have. Match the customer's language (English, Arabic, or French).

How to help:
- When products are listed under "CATALOGUE MATCHES" below, recommend 3–5 of them (not just one), each with its price and link. Give a real beauty-associate touch: a half-sentence on why each fits (finish, skin concern it targets, scent character). Lead with the suggestion — don't interrogate the customer first.
- Treat CATALOGUE MATCHES as authoritative and complete for this request — if items are listed, we carry them; never say "we don't have that" or send the customer elsewhere when matches are present.
- If the customer describes a skincare concern (blackheads, dryness, oiliness, sensitivity, dark spots, fine lines, dullness…), assume we likely carry something for it and lean on the matches provided — they've already been searched broadly for that concern.
- If the customer says they like a fragrance or a type of scent, use the matches (picked for shared scent character) to suggest similar options and briefly say what they share (e.g. "also warm and vanilla-forward").
- If the matches genuinely don't fit, ask ONE short clarifying question (budget, brand, or finish), then suggest again.
- Only when CATALOGUE MATCHES explicitly says none were found, offer to source it: ask for their Instagram handle or email and say the team will follow up within 2 hours.
- Only collect contact details when sourcing an item we don't have, or when the customer is ready to order.

Never invent products, prices, or links — only use the CATALOGUE MATCHES list.
Write links as plain URLs exactly as given (no markdown, no brackets) — the chat turns them into buttons.
Never mention Selfridges, Space NK, or any sourcing retailer.`;

// `||` (not `??`) so an empty env var still falls back; www is stripped
// because the www host has no certificate of its own — links must use the apex.
const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://seasonsbyb.co.uk")
  .replace(/\/$/, "")
  .replace(/^https?:\/\/www\./, "https://");

interface CatalogMatch {
  id: string;
  brand: string;
  name: string;
  price_usd: number;
}

// US→UK spelling / stem map so a "moisturizer" query matches our UK-spelled
// "moisturiser" rows. Falls back to the raw token for anything not listed.
const STEM: Record<string, string> = {
  moisturizer: "moisturis", moisturiser: "moisturis", moisturizing: "moisturis",
  moisturising: "moisturis", moisturize: "moisturis", moisturise: "moisturis",
  antiaging: "anti-ag", "anti-aging": "anti-ag", "anti-ageing": "anti-ag",
  color: "colour", colors: "colour", colour: "colour",
  lipsticks: "lipstick", cleansers: "cleanser", serums: "serum",
  foundations: "foundation", mascaras: "mascara", perfumes: "perfume"
};

// Skincare-concern vocabulary → extra single-word search terms. The customer
// says "blackheads" or "dryness"; product names say "Pore", "Salicylic",
// "Hydrating". Without this, a plain word match against brand+name finds
// nothing and Béa wrongly says we don't carry it. Keyed on the SINGULAR form
// (the token pipeline below de-pluralises before this lookup runs). Values
// are plain lowercase words (no hyphens/spaces) so they substring-match
// against the space-and-punctuation-normalised haystack.
const CONCERN_EXPAND: Record<string, string[]> = {
  blackhead: ["pore", "salicylic", "bha", "charcoal", "clarifying", "exfoliating"],
  pore: ["blackhead", "salicylic", "bha", "charcoal", "clarifying"],
  acne: ["blemish", "spot", "salicylic", "clarifying", "teatree"],
  blemish: ["acne", "spot", "salicylic", "clarifying"],
  breakout: ["acne", "blemish", "spot", "salicylic"],
  pimple: ["acne", "blemish", "spot"],
  dry: ["hydrat", "moistur", "nourish"],
  dryness: ["hydrat", "moistur", "nourish"],
  dehydrated: ["hydrat", "moistur", "hyaluronic"],
  oily: ["mattify", "matte", "niacinamide", "sebum"],
  oiliness: ["mattify", "matte", "niacinamide", "sebum"],
  shine: ["mattify", "matte"],
  sensitive: ["sooth", "calm", "gentle", "centella"],
  sensitivity: ["sooth", "calm", "gentle", "centella"],
  redness: ["sooth", "calm", "centella"],
  irritated: ["sooth", "calm", "gentle"],
  wrinkle: ["retinol", "firming", "collagen"],
  aging: ["retinol", "firming", "collagen", "antiag"],
  dull: ["brighten", "glow", "radiance", "vitamin"],
  dullness: ["brighten", "glow", "radiance", "vitamin"],
  uneven: ["brighten", "vitamin", "tone"],
  hyperpigmentation: ["brighten", "vitamin", "spot"],
  spot: ["blemish", "acne", "brighten"],
  scar: ["brighten", "repair", "healing"]
};

// Fragrance/scent descriptor words. There's no real notes/scent-family data
// in the catalogue (no product has ingredient or note metadata), so "similar
// fragrance" reasoning is necessarily heuristic: these words tend to appear
// directly in fragrance product names (Vanilla Skin, Cherry Stem, Amber
// Haze…), so a customer naming a scent character surfaces other fragrances
// sharing that word. Approximate, not a real perfumer's note breakdown.
const FRAGRANCE_DESCRIPTORS = new Set([
  "vanilla", "cherry", "berry", "amber", "musk", "musky", "floral", "citrus",
  "woody", "fresh", "sweet", "spicy", "rose", "jasmine", "coconut", "caramel",
  "tropical", "oud", "smoke", "smoky", "powdery", "fruity", "gourmand", "warm",
  "cozy"
]);

// Words that signal "carry on from what we were just discussing" rather than
// a fresh, self-contained request — e.g. "I like that one", "something
// similar". On their own these have no searchable nouns, so folding in the
// assistant's last message lets a follow-up inherit the product/scent words
// Béa herself just used.
const REFERENTIAL = /\b(that|similar|same|another|those|these|like\s+it|more\s+like)\b/i;

const STOP = new Set([
  "the", "and", "for", "with", "please", "want", "need", "looking", "under",
  "below", "less", "than", "dollars", "dollar", "usd", "something", "good",
  "best", "nice", "find", "get", "buy", "around", "about", "budget", "price",
  "cheap", "an", "of", "to", "my", "me", "is", "are", "can", "you", "im",
  "would", "like", "some", "any", "that", "this", "one", "it", "do", "does",
  "have", "has", "in", "on", "recommend", "suggest", "show", "give", "hello",
  "hi", "hey", "thanks", "thank", "please", "could", "what", "which", "your"
]);

// Pull a max USD budget from phrasing like "under $50", "below 50 dollars", "50$".
function extractBudgetUsd(text: string): number | null {
  const m =
    text.match(/(?:under|below|less than|max|up to|cheaper than|<)\s*\$?\s*(\d{1,5})/i) ||
    text.match(/\$\s*(\d{1,5})/) ||
    text.match(/(\d{1,5})\s*(?:dollars|usd|\$)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Turns the customer's raw words into the base token list: lowercase,
// accent-stripped, stopword-filtered, US→UK stemmed. This is the "what did
// they actually say" list — used both as search terms and (via its length)
// to decide how many hits count as a real match.
function coreTokens(text: string): string[] {
  return [
    ...new Set(
      text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 || /^\d+$/.test(t))
        .filter((t) => !STOP.has(t))
        .map((t) => (STEM[t] ?? t).replace(/[^a-z0-9]/g, ""))
        .filter(Boolean)
    )
  ].slice(0, 8);
}

interface ExpandedTokens {
  tokens: string[];
  // Which fallback category (if any) to browse when the direct search comes
  // up thin — set when a token matched a known skincare-concern or
  // fragrance-descriptor word, so Béa still has something concrete to
  // suggest instead of "we don't carry that".
  fallbackCategory: "Skincare" | "Fragrance" | null;
}

// Broadens the customer's own words with concern/scent synonyms and a naive
// singular form, so "blackheads" also searches "pore"/"salicylic"/etc, and
// plurals match singular product-name words without a giant hardcoded list.
function expandTokens(base: string[]): ExpandedTokens {
  const all = new Set(base);
  let fallbackCategory: ExpandedTokens["fallbackCategory"] = null;

  for (const t of base) {
    // Naive de-pluralisation ("blackheads" → "blackhead", "spots" → "spot").
    const singular = t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : null;
    if (singular) all.add(singular);

    for (const form of singular ? [t, singular] : [t]) {
      const extra = CONCERN_EXPAND[form];
      if (extra) {
        fallbackCategory = "Skincare";
        for (const w of extra) all.add(w);
      }
      if (FRAGRANCE_DESCRIPTORS.has(form) && fallbackCategory === null) {
        fallbackCategory = "Fragrance";
      }
    }
  }

  return { tokens: [...all].slice(0, 20), fallbackCategory };
}

// Search the live catalogue for products matching the customer's request, so
// Béa recommends real items (with price + link) instead of only collecting a
// contact. Returns up to 8 budget-friendly, deliverable matches.
//
// Ranking matters: products matching MORE of the customer's words come first,
// so "dior spf matte foundation" surfaces the Dior foundation rather than the
// eight cheapest products that happen to contain any single word. Brand,
// name, category and subcategory are all searched (not just name) so a
// concern word that only appears in the category/subcategory still counts,
// with accents/punctuation stripped (Kiehl'S, Crème…).
//
// When the direct word search comes up thin AND we recognised a skincare
// concern or fragrance descriptor, this falls back to browsing that
// category's bestsellers — so a real concern/scent request always surfaces
// concrete options instead of an empty "we don't have that".
async function searchCatalog(text: string, maxUsd: number | null): Promise<CatalogMatch[]> {
  const base = coreTokens(text);
  if (base.length === 0) return [];
  const { tokens, fallbackCategory } = expandTokens(base);
  // Chat phrasing is noisy, so require only half the customer's OWN words to
  // hit — full matches still rank first via the hits ordering. Expansion
  // words are extra chances to hit, not an extra bar to clear.
  const minHits = Math.max(1, Math.ceil(base.length / 2));
  const hay = normalizedHaystackSql("brand || ' ' || name || ' ' || category || ' ' || coalesce(subcategory, '')");
  const brandHay = normalizedHaystackSql("brand");
  const hits = `(select count(*) from unnest($1::text[]) as t where ${hay} like '%' || t || '%')`;
  // Brand matches count double, so "kiehls moisturizer" leads with Kiehl's
  // moisturisers rather than any cheaper moisturiser.
  const brandHits = `(select count(*) from unnest($1::text[]) as t where ${brandHay} like '%' || t || '%')`;
  let rows: CatalogMatch[] = [];
  try {
    const sql = getSql();
    rows = (await sql(
      `select id, brand, name, price_usd::float8 as price_usd
       from products
       where ${hits} >= $2
         and ($3::float8 is null or (price_usd is not null and price_usd <= $3))
         and coalesce(image_url, '') <> ''
       order by (${hits} + ${brandHits}) desc, deliverable_lebanon desc nulls last, price_usd asc nulls last
       limit 8`,
      [tokens, minHits, maxUsd]
    )) as CatalogMatch[];
  } catch {
    rows = [];
  }

  if (rows.length >= 2 || !fallbackCategory) return rows;

  // Thin (or empty) direct match on a recognised concern/scent request — top
  // up with that category's bestsellers rather than leaving Béa with nothing.
  try {
    const sql = getSql();
    const excludeIds = rows.map((r) => r.id);
    const fallbackRows = (await sql(
      `select id, brand, name, price_usd::float8 as price_usd
       from products
       where category = $1
         and ($2::float8 is null or (price_usd is not null and price_usd <= $2))
         and coalesce(image_url, '') <> ''
         and not (id = any($3::uuid[]))
       order by coalesce(is_bestseller, false) desc, popularity asc nulls last, price_usd asc nulls last
       limit $4`,
      [fallbackCategory, maxUsd, excludeIds, 8 - rows.length]
    )) as CatalogMatch[];
    return [...rows, ...fallbackRows];
  } catch {
    return rows;
  }
}

function catalogBlock(matches: CatalogMatch[]): string {
  if (matches.length === 0) {
    return "\n\nCATALOGUE MATCHES: none for this request — offer to source it and collect their Instagram or email.";
  }
  const lines = matches
    .map((p) => `- ${p.brand} ${p.name} — $${Math.round(p.price_usd)} — ${SITE_BASE}/product/${p.id}`)
    .join("\n");
  return `\n\nCATALOGUE MATCHES (we carry these — recommend 3–5, with price and link):\n${lines}`;
}

// Grab the first plausible phone number from text.
function extractPhone(text: string): string | null {
  const m = text.match(/(\+?\d[\d\s().-]{6,}\d)/);
  if (!m) return null;
  const digits = m[1].replace(/[^\d+]/g, "");
  return digits.replace(/[^\d]/g, "").length >= 7 ? m[1].trim() : null;
}

// Grab the first contact detail (email, @handle, or phone) from text.
function extractContact(text: string): string | null {
  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) return email[0];
  const handle = text.match(/@[A-Za-z0-9._]{2,}/);
  if (handle) return handle[0];
  return extractPhone(text);
}

function fallbackBea(messages: ChatMessage[], matches: CatalogMatch[]): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length === 0) {
    return "Hi, I'm Béa at Seasons by B — what are you looking for today?";
  }
  const last = userMsgs[userMsgs.length - 1]?.content ?? "";
  if (extractContact(last)) {
    return "Perfect — noted. The team will reach out on Instagram or by email within 2 hours. 🐝";
  }
  if (matches.length > 0) {
    const picks = matches
      .slice(0, 3)
      .map((p) => `${p.brand} ${p.name} ($${Math.round(p.price_usd)}) — ${SITE_BASE}/product/${p.id}`)
      .join("  •  ");
    return `We carry a few options: ${picks}. Want more, or something more specific?`;
  }
  return "I couldn't find that in stock — share your Instagram handle or email and the team will source it within 2 hours.";
}

async function callBea(messages: ChatMessage[], system: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  // claude-sonnet-4-20250514 returned 4xx on this account; use the model proven
  // to work here. Override with ANTHROPIC_CHAT_MODEL for a specific Sonnet id.
  const model = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-haiku-4-5-20251001";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        // Recommending 3-5 options with a reason each needs more room than a
        // single-suggestion reply did.
        max_tokens: 450,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[bespoke-chat] anthropic ${res.status} ${detail.slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
  } catch (err) {
    console.warn(`[bespoke-chat] call failed: ${(err as Error).message}`);
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[]; sessionId?: string };
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-20)
    : [];
  const sessionId = (body.sessionId ?? "").toString().slice(0, 80) || "anon";

  const userMsgs = messages.filter((m) => m.role === "user");
  // Search the catalogue from the latest request (+ recent context) so Béa can
  // recommend real products. Budget is read from the whole conversation.
  const lastUser = userMsgs[userMsgs.length - 1]?.content ?? "";
  const allUserText = userMsgs.map((m) => m.content).join(" ");
  // A short or referential follow-up ("I like that one", "something
  // similar") has no searchable noun of its own — fold in Béa's own last
  // reply so it inherits whatever product/scent words she just suggested.
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const meaningfulWordCount = lastUser.split(/\s+/).filter((w) => w.length >= 3).length;
  const searchText =
    lastAssistant && (REFERENTIAL.test(lastUser) || meaningfulWordCount <= 3)
      ? `${lastUser} ${lastAssistant}`
      : lastUser || allUserText;
  const matches = await searchCatalog(searchText, extractBudgetUsd(allUserText));
  const system = SYSTEM_PROMPT + catalogBlock(matches);

  const reply = (await callBea(messages, system)) ?? fallbackBea(messages, matches);
  const whatsapp = extractContact(userMsgs.map((m) => m.content).join(" "));
  const replySignalsDone = /2 hours|reach out|noted everything|i've noted|follow up/i.test(reply);
  const completed = Boolean(whatsapp) && (userMsgs.length >= 3 || replySignalsDone);

  if (completed) {
    const summary = userMsgs.map((m) => `• ${m.content}`).join("\n").slice(0, 2000);
    const fullConversation = [...messages, { role: "assistant" as const, content: reply }];
    try {
      await ensureSchema();
      const sql = getSql();
      await sql`
        insert into bespoke_requests (session_id, customer_whatsapp, conversation_summary, full_conversation)
        values (${sessionId}, ${whatsapp}, ${summary}, ${JSON.stringify(fullConversation)})
      `;
    } catch (err) {
      console.error("[bespoke-chat] failed to save request", err);
    }
    sendBespokeAlert(whatsapp, summary).catch((err) => console.error("[bespoke-chat] alert failed", err));
  }

  return NextResponse.json({ response: reply, completed });
}
