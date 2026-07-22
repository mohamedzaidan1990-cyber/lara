"use client";

import { useState } from "react";
import type { AdminReviewRow } from "@/lib/reviews";

interface Props {
  reviews: AdminReviewRow[];
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminReviewsTab({ reviews: initialReviews }: Props) {
  const [reviews, setReviews] = useState(initialReviews);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function toggleHidden(id: string, hidden: boolean) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden })
      });
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, hidden: data.review.hidden } : r)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="mt-8 overflow-x-auto border border-ink/10">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-ink/60">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Review</th>
            <th className="px-4 py-3">Reviewer</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink/50">
                No reviews yet.
              </td>
            </tr>
          ) : (
            reviews.map((r) => (
              <tr key={r.id} className="border-b border-ink/10 align-top">
                <td className="px-4 py-3 text-sm text-ink">
                  {r.product_brand} {r.product_name}
                </td>
                <td className="px-4 py-3 text-sm text-gold">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </td>
                <td className="max-w-sm px-4 py-3 text-sm text-ink/70">{r.review_text ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-ink/70">{r.reviewer_name}</td>
                <td className="px-4 py-3 text-sm text-ink/70">{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3 text-sm">{r.hidden ? "Hidden" : "Published"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={updatingId === r.id}
                    onClick={() => toggleHidden(r.id, !r.hidden)}
                    className="text-xs uppercase tracking-[0.16em] text-accent hover:underline disabled:opacity-40"
                  >
                    {r.hidden ? "Unhide" : "Hide"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
