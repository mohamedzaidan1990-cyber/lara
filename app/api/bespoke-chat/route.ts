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

const SYSTEM_PROMPT = `You are Béa, the shopping assistant for Seasons by B — a luxury beauty boutique that delivers London's finest to your door.

Style: warm, sharp and CONCISE. Reply in 1–2 short sentences, never long paragraphs. Match the customer's language (English, Arabic, or French).

How to help:
- When products are listed under "CATALOGUE MATCHES" below, recommend 1–3 of them by name, each with its price and link. Lead with the suggestion — don't interrogate the customer first.
- If the matches don't fit, ask ONE short clarifying question (budget, brand, or finish), then suggest again.
- If there are no matches, or the customer wants something we don't carry, offer to source it: ask for their Instagram handle or email and say the team will follow up within 2 hours.
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

// Search the live catalogue for products matching the customer's request, so
// Béa recommends real items (with price + link) instead of only collecting a
// contact. Returns up to 4 budget-friendly, deliverable matches.
//
// Ranking matters: products matching MORE of the customer's words come first,
// so "dior spf matte foundation" surfaces the Dior foundation rather than the
// four cheapest products that happen to contain any single word. Brand+name
// are matched with accents/punctuation stripped (Kiehl'S, Crème…).
async function searchCatalog(text: string, maxUsd: number | null): Promise<CatalogMatch[]> {
  const tokens = [
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
  if (tokens.length === 0) return [];
  // Chat phrasing is noisy, so require only half the tokens — full matches
  // still rank first via the hits ordering.
  const minHits = Math.max(1, Math.ceil(tokens.length / 2));
  const hay = normalizedHaystackSql("brand || ' ' || name");
  const brandHay = normalizedHaystackSql("brand");
  const hits = `(select count(*) from unnest($1::text[]) as t where ${hay} like '%' || t || '%')`;
  // Brand matches count double, so "kiehls moisturizer" leads with Kiehl's
  // moisturisers rather than any cheaper moisturiser.
  const brandHits = `(select count(*) from unnest($1::text[]) as t where ${brandHay} like '%' || t || '%')`;
  try {
    const sql = getSql();
    const rows = (await sql(
      `select id, brand, name, price_usd::float8 as price_usd
       from products
       where ${hits} >= $2
         and ($3::float8 is null or (price_usd is not null and price_usd <= $3))
         and coalesce(image_url, '') <> ''
       order by (${hits} + ${brandHits}) desc, deliverable_lebanon desc nulls last, price_usd asc nulls last
       limit 4`,
      [tokens, minHits, maxUsd]
    )) as CatalogMatch[];
    return rows;
  } catch {
    return [];
  }
}

function catalogBlock(matches: CatalogMatch[]): string {
  if (matches.length === 0) {
    return "\n\nCATALOGUE MATCHES: none for this request — offer to source it and collect their Instagram or email.";
  }
  const lines = matches
    .map((p) => `- ${p.brand} ${p.name} — $${Math.round(p.price_usd)} — ${SITE_BASE}/product/${p.id}`)
    .join("\n");
  return `\n\nCATALOGUE MATCHES (recommend 1–3 of these, with price and link):\n${lines}`;
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
      .slice(0, 2)
      .map((p) => `${p.brand} ${p.name} ($${Math.round(p.price_usd)}) — ${SITE_BASE}/product/${p.id}`)
      .join("  •  ");
    return `Try ${picks}. Want more options or something specific?`;
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
        max_tokens: 160,
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
  const matches = await searchCatalog(lastUser || allUserText, extractBudgetUsd(allUserText));
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
