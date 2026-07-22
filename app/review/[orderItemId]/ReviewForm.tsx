"use client";

import { useState } from "react";

export default function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, rating, reviewText: reviewText.trim() || null })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.error === "already_reviewed"
            ? "You've already reviewed this item."
            : "Something went wrong — please try again."
        );
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong — please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="mt-8 text-sm text-ink/70">Thank you for your review!</p>;
  }

  return (
    <div className="mt-8">
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={"text-3xl leading-none " + (n <= rating ? "text-gold" : "text-ink/20")}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Tell us what you thought (optional)"
        rows={4}
        className="mt-4 w-full border border-ink/15 bg-cream p-3 text-sm"
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={rating < 1 || submitting}
        onClick={submit}
        className="btn-gold mt-4 w-fit disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
