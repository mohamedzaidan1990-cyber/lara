"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart, computeTotals } from "@/lib/cart";
import { productImageSrc } from "@/lib/images";
import { BeeMascot } from "@/components/BeeMascot";
import { WHATSAPP_URL } from "@/lib/links";

type PaymentMethod = "whish_direct" | "whish_link";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

interface Confirmation {
  order_number: string;
  items: { brand: string; name: string; quantity: number; category: string }[];
  payment_method: PaymentMethod;
}

export default function CheckoutClient({ whish }: { whish: string }) {
  const items = useCart((s) => s.items);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const clearCart = useCart((s) => s.clearCart);
  const { totalItems, totalUSD } = computeTotals(items);
  const hasFragrance = items.some((i) => i.category === "Fragrance");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", address: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("whish_direct");
  const [screenshot, setScreenshot] = useState<{ name: string; dataUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleScreenshot(file: File | null) {
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError("Screenshot must be under 4MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setScreenshot({ name: file.name, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function placeOrder() {
    setError(null);
    if (!form.full_name || !form.email || !form.phone || !form.address) {
      setError("Name, email, phone and address are required.");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (paymentMethod === "whish_direct" && !screenshot) {
      setError("Please upload your Whish payment screenshot.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            full_name: form.full_name,
            email: form.email.trim(),
            phone: form.phone,
            address: form.address,
            notes: form.notes
          },
          items: items.map((i) => ({
            brand: i.brand,
            name: i.name,
            product_url: i.product_url,
            image_url: i.image_url,
            price_gbp: i.price_gbp,
            price_usd: i.price_usd,
            quantity: i.quantity
          })),
          payment_method: paymentMethod,
          payment_screenshot: paymentMethod === "whish_direct" ? screenshot?.dataUrl ?? null : null
        })
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to place order");
      }
      const data = (await res.json()) as { order_number: string };
      setConfirmation({
        order_number: data.order_number,
        items: items.map((i) => ({ brand: i.brand, name: i.name, quantity: i.quantity, category: i.category })),
        payment_method: paymentMethod
      });
      clearCart();
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Empty cart (and not yet confirmed)
  if (items.length === 0 && step !== 4) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-24 text-center sm:px-6">
        <BeeMascot variant="floating" />
        <h1 className="font-serif text-3xl text-ink">Your cart is empty</h1>
        <Link href="/" className="btn-gold">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {step < 4 ? <Stepper step={step} /> : null}

      {error ? (
        <p className="mt-6 rounded border border-accent/40 bg-accent/5 p-3 text-sm text-accent-700">{error}</p>
      ) : null}

      {step === 1 ? (
        <section className="mt-8">
          <h1 className="font-serif text-3xl text-ink">Review your cart</h1>
          <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
            {items.map((item) => {
              const src = productImageSrc(item.image_url);
              return (
                <li key={item.id} className="flex gap-4 py-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden bg-ink/[0.04]">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-ink/55">{item.brand}</p>
                    <p className="text-sm text-ink">{item.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" aria-label="Decrease" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex h-6 w-6 items-center justify-center border border-ink/20 hover:border-accent">−</button>
                      <span className="min-w-5 text-center text-sm">{item.quantity}</span>
                      <button type="button" aria-label="Increase" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex h-6 w-6 items-center justify-center border border-ink/20 hover:border-accent">+</button>
                      <button type="button" onClick={() => removeItem(item.id)} className="ml-3 text-[10px] uppercase tracking-[0.18em] text-ink/40 hover:text-accent">Remove</button>
                    </div>
                  </div>
                  <div className="font-serif text-ink">{formatUsd(item.price_usd * item.quantity)}</div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm uppercase tracking-[0.18em] text-ink/60">Total ({totalItems})</span>
            <span className="font-serif text-2xl text-ink">{formatUsd(totalUSD)}</span>
          </div>
          <DeliveryNote />
          {hasFragrance ? <FragranceNote /> : null}
          <button type="button" onClick={() => setStep(2)} className="btn-primary mt-6 w-full justify-center">
            Continue to Details
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-8">
          <h1 className="font-serif text-3xl text-ink">Your details</h1>
          <div className="mt-6 space-y-4">
            <Field label="Full name" value={form.full_name} onChange={(v) => update("full_name", v)} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} />
            <Field label="Lebanese phone number" value={form.phone} onChange={(v) => update("phone", v)} placeholder="03 000 000" />
            <div>
              <label className="label">Delivery address in Lebanon</label>
              <textarea className="input min-h-24" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div>
              <label className="label">Special notes (optional)</label>
              <textarea className="input min-h-20" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={() => setStep(1)} className="text-xs uppercase tracking-[0.2em] text-ink/50 hover:text-accent">← Back</button>
            <button
              type="button"
              onClick={() => {
                if (!form.full_name || !form.email || !form.phone || !form.address) {
                  setError("Name, email, phone and address are required.");
                  return;
                }
                if (!EMAIL_RE.test(form.email.trim())) {
                  setError("Please enter a valid email address.");
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="btn-primary"
            >
              Continue to Payment
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mt-8">
          <h1 className="font-serif text-3xl text-ink">Payment</h1>
          <div className="mt-6 border border-ink/10 bg-cream p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Order summary</p>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.brand} — {i.name}{i.quantity > 1 ? ` ×${i.quantity}` : ""}</span>
                  <span>{formatUsd(i.price_usd * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 font-serif text-lg text-ink">
              <span>Total</span>
              <span>{formatUsd(totalUSD)}</span>
            </div>
            <DeliveryNote />
            {hasFragrance ? <FragranceNote /> : null}
          </div>

          <div className="mt-6 space-y-3">
            <PayOption active={paymentMethod === "whish_direct"} onClick={() => setPaymentMethod("whish_direct")} title="Direct Whish transfer" body={`Send to Whish ${whish}, then upload your screenshot.`} />
            <PayOption active={paymentMethod === "whish_link"} onClick={() => setPaymentMethod("whish_link")} title="Request Whish payment link" body="We'll send a secure payment link via Instagram or email." />
          </div>

          {paymentMethod === "whish_direct" ? (
            <div className="mt-5">
              <label className="label">Payment screenshot</label>
              <input type="file" accept="image/*" onChange={(e) => handleScreenshot(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
              {screenshot ? <p className="mt-2 text-xs text-ink/60">Attached: {screenshot.name}</p> : null}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={() => setStep(2)} className="text-xs uppercase tracking-[0.2em] text-ink/50 hover:text-accent">← Back</button>
            <button type="button" onClick={placeOrder} disabled={submitting} className="btn-primary disabled:opacity-40">
              {submitting ? "Placing…" : "Place Order"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 && confirmation ? (
        <Confirmation confirmation={confirmation} />
      ) : null}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Cart", "Details", "Payment"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center gap-2">
          <span
            className={"flex h-7 w-7 items-center justify-center rounded-full text-xs " + (step >= i + 1 ? "text-ink" : "text-ink/40")}
            style={{ backgroundColor: step >= i + 1 ? "#F4D360" : "rgba(35,39,42,0.08)" }}
          >
            {i + 1}
          </span>
          <span className={"text-[10px] uppercase tracking-[0.18em] " + (step >= i + 1 ? "text-ink" : "text-ink/40")}>{l}</span>
          {i < labels.length - 1 ? <span className="h-px flex-1 bg-ink/10" /> : null}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  );
}

function PayOption({ active, onClick, title, body }: { active: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button type="button" onClick={onClick} className={"block w-full rounded border p-4 text-left transition-colors " + (active ? "border-gold bg-gold/15" : "border-ink/15 bg-white hover:border-gold/60")}>
      <p className="font-serif text-lg text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink/65">{body}</p>
    </button>
  );
}

// Delivery within Lebanon is settled in cash with the courier, separate from
// the invoice — shown wherever the order total appears.
function DeliveryNote() {
  return (
    <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-xs leading-relaxed text-ink/70">
      🛵 <strong className="text-ink">Delivery within Lebanon: $3–5</strong> depending on your location, paid in
      cash directly to the delivery driver on arrival — <strong className="text-ink">not included in this invoice</strong>.
    </p>
  );
}

function FragranceNote() {
  return (
    <p className="mt-2 rounded-lg bg-accent/5 px-3 py-2 text-xs leading-relaxed text-ink/70">
      🌸 <strong className="text-ink">Fragrances &amp; perfumes are non-returnable</strong> — Selfridges&rsquo; policy on
      fragrance is strict, so perfume orders are final.
    </p>
  );
}

function Confirmation({ confirmation }: { confirmation: Confirmation }) {
  const names = confirmation.items.map((i) => `${i.brand} ${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join(", ");
  const msg =
    confirmation.payment_method === "whish_link"
      ? `Hi Seasons by B, my order ${confirmation.order_number} (${names}). Please send me a Whish payment link.`
      : `Hi Seasons by B, my order ${confirmation.order_number} (${names}). I've sent payment via Whish.`;
  void msg; // Instagram DMs can't be pre-filled; we just open the thread.
  const wa = WHATSAPP_URL;

  return (
    <motion.section className="py-6 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <BeeMascot variant="success" />
      <h1 className="mt-2 font-serif text-3xl text-ink">Order placed! 🐝</h1>
      <p className="mt-3 text-sm text-ink/70">
        Order number <span className="font-mono text-ink">{confirmation.order_number}</span>. Estimated delivery: 10–14 working days.
      </p>
      <div className="mx-auto mt-6 max-w-md border border-ink/10 bg-cream p-5 text-left">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Your items</p>
        <ul className="mt-3 space-y-1 text-sm text-ink">
          {confirmation.items.map((i, idx) => (
            <li key={idx}>{i.brand} — {i.name}{i.quantity > 1 ? ` ×${i.quantity}` : ""}</li>
          ))}
        </ul>
        <DeliveryNote />
        {confirmation.items.some((i) => i.category === "Fragrance") ? <FragranceNote /> : null}
      </div>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a href={wa} target="_blank" rel="noreferrer" className="btn-gold">
          Send confirmation on Instagram
        </a>
        <Link href="/" className="btn-outline">Continue Shopping</Link>
      </div>
      <p className="mt-4 text-xs text-ink/60">
        <Link href={`/track?order=${confirmation.order_number}`} className="uppercase tracking-[0.18em] hover:text-accent">
          Track your order →
        </Link>
      </p>
    </motion.section>
  );
}
