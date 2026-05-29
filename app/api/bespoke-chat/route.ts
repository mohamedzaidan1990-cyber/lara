import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { sendBespokeAlert } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Béa, the personal shopping consultant for Seasons by B — a luxury personal shopping service that sources from London's finest boutiques.

Your personality: warm, knowledgeable, sophisticated but approachable. You speak like a knowledgeable friend who works in luxury retail, not a corporate chatbot.

Your goal: understand exactly what the client is looking for so we can source it for them from London.

Conversation flow:
1. Warm welcome, ask what they're looking for
2. Ask clarifying questions: occasion, budget range, preferred brands, colour preferences, size if relevant
3. Make specific product suggestions based on what you know about luxury beauty and fashion
4. Once you have enough information (after 3-5 exchanges), summarise their request and tell them: "I've noted everything — our team will reach out on WhatsApp within 2 hours with options and pricing."
5. Collect their WhatsApp number to send them the follow-up

Always respond in the same language the customer writes in (Arabic, French, or English).
Keep responses concise — 2-3 sentences maximum per message.
Never mention Selfridges, Space NK, or any specific sourcing retailers.`;

// Grab the first plausible phone number from text.
function extractPhone(text: string): string | null {
  const m = text.match(/(\+?\d[\d\s().-]{6,}\d)/);
  if (!m) return null;
  const digits = m[1].replace(/[^\d+]/g, "");
  return digits.replace(/[^\d]/g, "").length >= 7 ? m[1].trim() : null;
}

function fallbackBea(messages: ChatMessage[]): string {
  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length === 0) {
    return "Hi, I'm Béa — your personal shopping consultant at Seasons by B. What are you looking for today?";
  }
  const last = userMsgs[userMsgs.length - 1]?.content ?? "";
  if (extractPhone(last)) {
    return "Perfect — I've noted everything. Our team will reach out on WhatsApp within 2 hours with options and pricing. 🐝";
  }
  if (userMsgs.length >= 2) {
    return "Lovely choice. So I can send you options and pricing, could you share your WhatsApp number? Our team will follow up within 2 hours.";
  }
  return "Wonderful — tell me a little more: the occasion, any preferred brands or colours, and your budget range all help me find the perfect piece.";
}

async function callBea(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-20250514";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
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

  const reply = (await callBea(messages)) ?? fallbackBea(messages);

  const userMsgs = messages.filter((m) => m.role === "user");
  const whatsapp = extractPhone(userMsgs.map((m) => m.content).join(" "));
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
