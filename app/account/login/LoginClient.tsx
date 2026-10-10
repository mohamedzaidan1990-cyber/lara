"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INSTAGRAM_DM_URL } from "@/lib/links";

type Mode = "login" | "signup";

export default function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ full_name: "", phone: "", pin: "", pin2: "", order_number: "" });
  const [needsOrderNumber, setNeedsOrderNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNeedsOrderNumber(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && form.pin !== form.pin2) {
      setError("The two PINs don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(mode === "login" ? "/api/account/login" : "/api/account/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { phone: form.phone, pin: form.pin }
            : { full_name: form.full_name, phone: form.phone, pin: form.pin, order_number: form.order_number }
        )
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; needs_order_number?: boolean };
      if (!res.ok) {
        if (data.needs_order_number) setNeedsOrderNumber(true);
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      router.replace("/account");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const pinProps = {
    type: "password",
    inputMode: "numeric" as const,
    pattern: "[0-9]{6}",
    maxLength: 6,
    autoComplete: mode === "login" ? "current-password" : "new-password",
    placeholder: "••••••",
    className: "input tracking-[0.5em]"
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">My account</p>
        <h1 className="mt-2 font-serif text-4xl text-ink">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/70">
          See all your orders and collect points on every dollar you spend — then redeem them for rewards.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 rounded-full border border-accent/20 bg-white p-1 text-xs font-bold uppercase tracking-[0.14em]">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={"rounded-full py-2.5 transition-colors " + (mode === m ? "bg-accent text-white" : "text-accent hover:bg-accent/10")}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" ? (
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" className="input" autoComplete="name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
          </div>
        ) : null}
        <div>
          <label className="label" htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="70 123 456"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="pin">{mode === "login" ? "6-digit PIN" : "Choose a 6-digit PIN"}</label>
          <input id="pin" {...pinProps} value={form.pin} onChange={(e) => update("pin", e.target.value.replace(/\D/g, ""))} required />
        </div>
        {mode === "signup" ? (
          <div>
            <label className="label" htmlFor="pin2">Confirm PIN</label>
            <input id="pin2" {...pinProps} value={form.pin2} onChange={(e) => update("pin2", e.target.value.replace(/\D/g, ""))} required />
          </div>
        ) : null}
        {mode === "signup" && needsOrderNumber ? (
          <div>
            <label className="label" htmlFor="order_number">One of your order numbers</label>
            <input
              id="order_number"
              className="input uppercase"
              placeholder="SBB-123456"
              value={form.order_number}
              onChange={(e) => update("order_number", e.target.value)}
              required
            />
            <p className="mt-2 text-xs text-ink/60">You&apos;ll find it on your invoice or order confirmation.</p>
          </div>
        ) : null}

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-ink/60">
        {mode === "login" ? "Forgot your PIN, or don't have your order number? " : "Already ordered with us but no order number? "}
        <a href={INSTAGRAM_DM_URL} target="_blank" rel="noreferrer" className="font-bold text-accent hover:underline">
          Message us
        </a>{" "}
        and we&apos;ll send you a PIN.
      </p>
    </div>
  );
}
