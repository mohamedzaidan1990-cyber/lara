"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OrderWithCustomer } from "@/lib/db";

type Source = "instagram" | "whatsapp" | "direct";
type PaymentMethod = "bank" | "wise" | "whish" | "cash" | "other";

interface Item {
  brand: string;
  name: string;
  price_usd: string;
  quantity: string;
}

interface Props {
  onClose: () => void;
  onCreated: (order: OrderWithCustomer) => void;
}

const SOURCE_OPTIONS: { value: Source; label: string; icon: string }[] = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "direct", label: "Direct / Other", icon: "📞" }
];

const PAYMENT_OPTS: { value: PaymentMethod; label: string }[] = [
  { value: "bank", label: "Bank Transfer" },
  { value: "wise", label: "Wise" },
  { value: "whish", label: "Whish" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" }
];

function emptyItem(): Item {
  return { brand: "", name: "", price_usd: "", quantity: "1" };
}

export default function AdminManualOrderModal({ onClose, onCreated }: Props) {
  const [source, setSource] = useState<Source>("instagram");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function removeItem(i: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const totalUsd = items.reduce((s, it) => {
    const p = parseFloat(it.price_usd) || 0;
    const q = parseInt(it.quantity) || 1;
    return s + p * q;
  }, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedItems = items.map((it) => ({
      brand: it.brand.trim(),
      name: it.name.trim(),
      price_usd: parseFloat(it.price_usd) || 0,
      quantity: parseInt(it.quantity) || 1
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          customer: { full_name: fullName, phone, address, email: email || undefined },
          items: parsedItems,
          payment_method: paymentMethod,
          payment_confirmed: paymentConfirmed,
          notes: notes || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");
      onCreated(data as OrderWithCustomer);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10"
        style={{ backgroundColor: "rgba(26,16,8,0.55)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="relative w-full max-w-2xl rounded-[1.75rem] bg-white shadow-pop"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-7 py-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-accent">Admin</p>
              <h2 className="font-serif text-xl text-ink">Add Manual Order</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink/50 hover:border-accent hover:text-accent"
            >
              ✕
            </button>
          </div>

          <form onSubmit={submit} className="divide-y divide-ink/8 px-7">

            {/* Source */}
            <div className="py-5">
              <Label>Order source</Label>
              <div className="mt-2 flex gap-2">
                {SOURCE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSource(s.value)}
                    className={
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors " +
                      (source === s.value
                        ? "border-accent bg-accent text-white"
                        : "border-ink/15 text-ink/60 hover:border-accent/50")
                    }
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div className="py-5">
              <Label>Customer details</Label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <FieldLabel>Full name *</FieldLabel>
                  <Input
                    value={fullName}
                    onChange={(v) => setFullName(v)}
                    placeholder="e.g. Layla Hassan"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <FieldLabel>
                    {source === "instagram" ? "Instagram handle / phone" : "Phone / WhatsApp"} *
                  </FieldLabel>
                  <Input
                    value={phone}
                    onChange={(v) => setPhone(v)}
                    placeholder={source === "instagram" ? "@username or +961…" : "+961…"}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <FieldLabel>Delivery address *</FieldLabel>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    rows={2}
                    placeholder="Street, area, city, Lebanon"
                    className="w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent"
                  />
                </div>
                <div className="col-span-2">
                  <FieldLabel>Email (optional)</FieldLabel>
                  <Input
                    value={email}
                    onChange={(v) => setEmail(v)}
                    placeholder="customer@email.com"
                    type="email"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="py-5">
              <Label>Order items</Label>
              <div className="mt-3 space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={it.brand}
                      onChange={(v) => updateItem(i, "brand", v)}
                      placeholder="Brand"
                      required
                      className="w-28 shrink-0"
                    />
                    <Input
                      value={it.name}
                      onChange={(v) => updateItem(i, "name", v)}
                      placeholder="Product name"
                      required
                      className="min-w-0 flex-1"
                    />
                    <div className="relative shrink-0 w-24">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink/40">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.price_usd}
                        onChange={(e) => updateItem(i, "price_usd", e.target.value)}
                        placeholder="0"
                        required
                        className="w-full rounded-xl border border-ink/15 bg-cream/60 py-2.5 pl-6 pr-3 text-sm text-ink outline-none focus:border-accent"
                      />
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      title="Quantity"
                      className="w-14 shrink-0 rounded-xl border border-ink/15 bg-cream/60 px-3 py-2.5 text-center text-sm text-ink outline-none focus:border-accent"
                    />
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="shrink-0 text-ink/30 hover:text-red-500"
                        title="Remove"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setItems((p) => [...p, emptyItem()])}
                  className="text-xs font-bold uppercase tracking-[0.16em] text-accent hover:opacity-70"
                >
                  + Add item
                </button>
                {totalUsd > 0 ? (
                  <p className="font-serif text-lg font-bold text-accent">
                    Total: ${totalUsd.toFixed(2)}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Payment */}
            <div className="py-5">
              <Label>Payment</Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {PAYMENT_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={
                      "rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors " +
                      (paymentMethod === opt.value
                        ? "border-accent bg-accent text-white"
                        : "border-ink/15 text-ink/60 hover:border-accent/50")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-ink/80">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  className="h-4 w-4 accent-[#c94f92]"
                />
                Payment already received / confirmed
              </label>
            </div>

            {/* Notes */}
            <div className="py-5">
              <Label>Notes (optional)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Shade requests, special instructions, DM screenshot reference…"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent"
              />
            </div>

            {error ? (
              <p className="py-3 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3 py-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ink/15 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-ink/60 hover:border-ink/30"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-accent px-8 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create Order"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-ink/50">{children}</p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs text-ink/60">{children}</p>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  className = ""
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={
        "w-full rounded-xl border border-ink/15 bg-cream/60 px-4 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent " +
        className
      }
    />
  );
}
