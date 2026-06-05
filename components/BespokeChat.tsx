"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BeeSvg } from "./BeeMascot";

interface Msg {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const WELCOME =
  "Hi, I'm Béa — your personal shopping consultant at Seasons by B. ✨ What are you looking for today?";

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function ChatPanel({ embedded, onClose }: { embedded: boolean; onClose?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: WELCOME, ts: 0 }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const sessionId = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId.current) {
      try {
        sessionId.current = crypto.randomUUID();
      } catch {
        sessionId.current = `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      }
    }
    // stamp the welcome message time on mount (avoids SSR/CSR mismatch)
    setMessages((prev) => (prev[0]?.ts === 0 ? [{ ...prev[0], ts: Date.now() }, ...prev.slice(1)] : prev));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending || completed) return;
    const next = [...messages, { role: "user" as const, content: text, ts: Date.now() }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/bespoke-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          messages: next.map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = (await res.json()) as { response?: string; completed?: boolean };
      setMessages((prev) => [...prev, { role: "assistant", content: data.response ?? "…", ts: Date.now() }]);
      if (data.completed) setCompleted(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble there. Could you try again?", ts: Date.now() }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={"flex flex-col overflow-hidden bg-cream " + (embedded ? "h-[560px] rounded-lg border border-ink/10 shadow-soft" : "h-full")}>
      <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3" style={{ backgroundColor: "#23272A" }}>
        <div className="flex items-center gap-2">
          <BeeSvg size={26} />
          <div>
            <p className="font-serif text-lg leading-none text-cream">Bespoke Consultation 🐝</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em]" style={{ color: "#F4D360" }}>Powered by AI</p>
          </div>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close chat" className="text-cream/70 hover:text-cream">✕</button>
        ) : null}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={"flex flex-col " + (m.role === "user" ? "items-end" : "items-start")}>
            <div
              className={
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed " +
                (m.role === "user" ? "bg-accent text-white" : "border border-ink/10 bg-white text-ink")
              }
            >
              {m.content}
            </div>
            {m.ts ? <span className="mt-1 text-[10px] text-ink/35">{formatTime(m.ts)}</span> : null}
          </div>
        ))}
        {sending ? (
          <div className="flex items-start">
            <div className="rounded-2xl border border-ink/10 bg-white px-3.5 py-2">
              <span className="bee-wings inline-block"><BeeSvg size={20} /></span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-ink/10 p-3">
        {completed ? (
          <p className="rounded bg-gold/15 px-3 py-2 text-center text-xs text-ink">
            Thank you 🐝 Our team will be in touch on Instagram or by email within 2 hours.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Béa what you're looking for…"
              className="flex-1 border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
            />
            <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-4 py-2 text-xs disabled:opacity-40">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function BespokeChat({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (embedded) {
    return <ChatPanel embedded />;
  }

  // Floating variant: hidden on /bespoke (the embedded chat lives there).
  if (pathname === "/bespoke") return null;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed bottom-0 left-0 z-[55] w-full sm:bottom-6 sm:left-6 sm:w-[380px]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="h-[70vh] sm:h-[520px]">
              <ChatPanel embedded={false} onClose={() => setOpen(false)} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Béa"
          className="bespoke-pulse fixed bottom-5 left-5 z-[55] flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-soft sm:bottom-6 sm:left-6"
          style={{ backgroundColor: "#F4D360" }}
        >
          <BeeSvg size={34} />
        </button>
      ) : null}
    </>
  );
}
