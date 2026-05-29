"use client";

import { useState } from "react";
import { BESPOKE_STATUSES, type BespokeRequestRow, type BespokeStatus } from "@/lib/db";

const STATUS_LABELS: Record<BespokeStatus, string> = {
  new: "New",
  contacted: "Contacted",
  fulfilled: "Fulfilled",
  declined: "Declined"
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const lebanon = digits.startsWith("961") ? digits : "961" + digits.replace(/^0/, "");
  return `https://wa.me/${lebanon}`;
}

export default function AdminBespokeRow({ request }: { request: BespokeRequestRow }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<BespokeStatus>(request.status);
  const [busy, setBusy] = useState(false);

  async function changeStatus(next: BespokeStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/bespoke-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error("Update failed");
      setStatus(next);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const wa = waLink(request.customer_whatsapp);

  return (
    <>
      <tr className="cursor-pointer border-b border-ink/10 hover:bg-ink/[0.02]" onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3 font-mono text-[11px] text-ink/70">{request.session_id.slice(0, 8)}</td>
        <td className="px-4 py-3 text-sm text-ink">{request.customer_whatsapp || <span className="text-ink/40">—</span>}</td>
        <td className="px-4 py-3 text-sm text-ink/70">
          <span className="line-clamp-1 max-w-md">{request.conversation_summary.replace(/\n/g, " · ")}</span>
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <select
            disabled={busy}
            value={status}
            onChange={(e) => changeStatus(e.target.value as BespokeStatus)}
            className="border border-ink/15 bg-white px-2 py-1 text-xs uppercase tracking-[0.12em] focus:border-accent focus:outline-none"
          >
            {BESPOKE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-xs text-ink/60">{formatDate(request.created_at)}</td>
      </tr>
      {open ? (
        <tr className="border-b border-ink/10 bg-ink/[0.02]">
          <td colSpan={5} className="px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Request summary</p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink">{request.conversation_summary}</p>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-gold mt-4 inline-block text-xs">
                    WhatsApp customer
                  </a>
                ) : null}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Full conversation</p>
                <div className="mt-2 space-y-2">
                  {(request.full_conversation ?? []).map((m, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45">{m.role === "user" ? "Customer" : "Béa"}</span>
                      <p className="text-ink">{m.content}</p>
                    </div>
                  ))}
                  {!request.full_conversation || request.full_conversation.length === 0 ? (
                    <p className="text-sm text-ink/40">No transcript stored.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
