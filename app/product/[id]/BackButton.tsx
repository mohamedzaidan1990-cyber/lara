"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-ink/60 transition-colors hover:text-accent"
    >
      ← Back
    </button>
  );
}
