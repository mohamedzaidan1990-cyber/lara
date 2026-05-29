"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BeeSvg } from "@/components/BeeMascot";

interface TrackResult {
  order_number: string;
  status: string;
  tracking_number: string | null;
  items: Array<{ brand: string; name: string; quantity: number }>;
  timestamps: {
    placed: string | null;
    payment_confirmed: string | null;
    ordered: string | null;
    shipped: string | null;
    delivered: string | null;
  };
}

const STEPS = ["Confirmed", "Processing", "Shipped", "Delivered"];

function stepIndex(status: string): number {
  if (status === "delivered") return 3;
  if (status === "shipped" || status === "in_lebanon") return 2;
  if (status === "ordered_selfridges") return 1;
  return 0;
}

export default function TrackClient() {
  const [order, setOrder] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoRan = useRef(false);

  async function lookup(q: string) {
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/track?order=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order not found");
      setResult(data as TrackResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function track(e: React.FormEvent) {
    e.preventDefault();
    void lookup(order.trim().toUpperCase());
  }

  // Prefill + auto-track from ?order= (e.g. from the confirmation page).
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const param = new URLSearchParams(window.location.search).get("order");
    if (param) {
      const q = param.trim().toUpperCase();
      setOrder(q);
      void lookup(q);
    }
  }, []);

  const idx = result ? stepIndex(result.status) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Order tracking</p>
        <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">Track Your Order</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink/70">
          Enter your order number (e.g. LARA-123456) to see its status. No login needed.
        </p>
      </div>

      <form onSubmit={track} className="mx-auto mt-8 flex max-w-md items-stretch gap-0 shadow-soft">
        <input
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder="LARA-123456"
          className="flex-1 border border-ink/15 bg-white px-4 py-3 text-base uppercase text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={loading} className="btn-primary px-6 disabled:opacity-50">
          {loading ? "…" : "Track"}
        </button>
      </form>

      {error ? <p className="mt-6 text-center text-sm text-accent-700">{error}</p> : null}

      {result ? (
        <div className="mt-12">
          <p className="text-center font-mono text-sm text-ink/60">{result.order_number}</p>

          {/* Progress bar with walking bee */}
          <div className="relative mt-10 px-2">
            <div className="absolute left-2 right-2 top-[18px] h-0.5 bg-ink/15" />
            <motion.div
              className="absolute top-[18px] h-0.5"
              style={{ left: 8, backgroundColor: "#F4D360" }}
              initial={{ width: 0 }}
              animate={{ width: `calc(${(idx / (STEPS.length - 1)) * 100}% - 8px)` }}
              transition={{ duration: 0.6 }}
            />
            <motion.div
              className="absolute -top-2 z-10"
              initial={{ left: "0%" }}
              animate={{ left: `${(idx / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.6 }}
              style={{ transform: "translateX(-50%)" }}
            >
              <span className="bee-anim-floating inline-block"><BeeSvg size={30} /></span>
            </motion.div>
            <div className="relative flex justify-between">
              {STEPS.map((label, i) => (
                <div key={label} className="flex flex-col items-center" style={{ width: 70 }}>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs"
                    style={{
                      borderColor: i <= idx ? "#F4D360" : "rgba(35,39,42,0.15)",
                      backgroundColor: i <= idx ? "#F4D360" : "#FFFDF5",
                      color: "#23272A"
                    }}
                  >
                    {i < idx ? "✓" : i + 1}
                  </span>
                  <span className={"mt-2 text-[10px] uppercase tracking-[0.16em] " + (i <= idx ? "text-ink" : "text-ink/40")}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {result.tracking_number ? (
            <p className="mt-8 text-center text-sm text-ink">
              Tracking number: <span className="font-mono">{result.tracking_number}</span>
            </p>
          ) : null}

          <div className="mx-auto mt-8 max-w-md border border-ink/10 bg-cream p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Items</p>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              {result.items.length === 0 ? (
                <li className="text-ink/50">Details available from our team.</li>
              ) : (
                result.items.map((it, i) => (
                  <li key={i}>
                    {it.brand} — {it.name}
                    {it.quantity > 1 ? <span className="text-ink/50"> ×{it.quantity}</span> : null}
                  </li>
                ))
              )}
            </ul>
            <p className="mt-4 text-xs text-ink/55">
              {result.status === "delivered" ? "Delivered 🐝" : "Estimated delivery: 10–14 working days from confirmation."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
