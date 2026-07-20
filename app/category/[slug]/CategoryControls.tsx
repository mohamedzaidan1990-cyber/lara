"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { BrandCount, SubcategoryCount } from "@/lib/categories";

const BUDGETS: Array<{ label: string; value: number | null }> = [
  { label: "All prices", value: null },
  { label: "Under $25", value: 25 },
  { label: "Under $50", value: 50 },
  { label: "Under $100", value: 100 },
  { label: "Under $150", value: 150 },
];

interface Props {
  current: "featured" | "newest" | "price-asc" | "price-desc";
  brands?: BrandCount[];
  currentBrand?: string | null;
  subcategories?: SubcategoryCount[];
  currentSubcategory?: string | null;
  currentMaxUsd?: number | null;
  slug: string;
}

const OPTIONS: Array<{ value: Props["current"]; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" }
];

export default function CategoryControls({
  current,
  brands = [],
  currentBrand = null,
  subcategories = [],
  currentSubcategory = null,
  currentMaxUsd = null,
  slug
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set("sort", e.target.value);
    // Reset to page 1 whenever sort changes.
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  // Brand and subcategory share the same behaviour: set/clear the param and
  // reset pagination.
  function onFilterChange(param: "brand" | "sub") {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const next = new URLSearchParams(params.toString());
      if (value) next.set(param, value);
      else next.delete(param);
      next.delete("page");
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `/category/${slug}?${qs}` : `/category/${slug}`);
      });
    };
  }

  function onBudgetChange(value: number | null) {
    const next = new URLSearchParams(params.toString());
    if (value !== null) next.set("maxusd", String(value));
    else next.delete("maxusd");
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/category/${slug}?${qs}` : `/category/${slug}`);
    });
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Budget filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-ink/60 mr-1 sm:block">Budget</span>
        {BUDGETS.map((b) => (
          <button
            key={b.label}
            type="button"
            disabled={pending}
            onClick={() => onBudgetChange(b.value)}
            className={
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors " +
              (currentMaxUsd === b.value
                ? "border-accent bg-accent text-white"
                : "border-ink/15 bg-white text-ink hover:border-accent hover:text-accent")
            }
          >
            {b.label}
          </button>
        ))}
      </div>
      {/* Sort + brand + subcategory */}
      <div className="flex items-center gap-2 text-sm text-ink/80 sm:flex-wrap sm:gap-4">
      {subcategories.length > 0 ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
          <label htmlFor="sub" className="hidden text-[10px] uppercase tracking-[0.2em] text-ink/60 sm:block">
            Type
          </label>
          <select
            id="sub"
            value={currentSubcategory ?? ""}
            onChange={onFilterChange("sub")}
            disabled={pending}
            aria-label="Type"
            className="w-full min-w-0 rounded-full border border-accent/20 bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-auto sm:max-w-[200px] sm:px-5"
          >
            <option value="">All types</option>
            {subcategories.map((s) => (
              <option key={s.subcategory} value={s.subcategory}>
                {s.subcategory} ({s.count})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {brands.length > 0 ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
          <label htmlFor="brand" className="hidden text-[10px] uppercase tracking-[0.2em] text-ink/60 sm:block">
            Brand
          </label>
          <select
            id="brand"
            value={currentBrand ?? ""}
            onChange={onFilterChange("brand")}
            disabled={pending}
            aria-label="Brand"
            className="w-full min-w-0 rounded-full border border-accent/20 bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-auto sm:max-w-[200px] sm:px-5"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand} ({b.count})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
        <label htmlFor="sort" className="hidden text-[10px] uppercase tracking-[0.2em] text-ink/60 sm:block">
          Sort
        </label>
        <select
          id="sort"
          value={current}
          onChange={onSortChange}
          disabled={pending}
          aria-label="Sort"
          className="w-full min-w-0 rounded-full border border-accent/20 bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-auto sm:px-5"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      </div>
    </div>
  );
}
