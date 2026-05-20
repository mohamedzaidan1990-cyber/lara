"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
  current: "newest" | "price-asc" | "price-desc";
}

const OPTIONS: Array<{ value: Props["current"]; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" }
];

export default function CategoryControls({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set("sort", e.target.value);
    // Reset to page 1 whenever sort changes.
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="flex items-center gap-3 text-sm text-ink/80">
      <label htmlFor="sort" className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
        Sort
      </label>
      <select
        id="sort"
        value={current}
        onChange={onChange}
        disabled={pending}
        className="border border-ink/15 bg-white px-3 py-2 text-xs uppercase tracking-[0.12em] text-ink focus:border-accent focus:outline-none"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
