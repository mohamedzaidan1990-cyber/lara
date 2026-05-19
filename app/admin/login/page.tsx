"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Wrong password");
      }
      router.replace("/admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="text-[10px] uppercase tracking-[0.32em] text-accent">Seasons by B</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Seasons by B — Admin</h1>
      <p className="mt-2 text-sm text-ink/70">Enter your password to access orders.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        {error ? (
          <p className="rounded border border-accent/40 bg-accent/5 p-3 text-xs text-accent-700">{error}</p>
        ) : null}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
