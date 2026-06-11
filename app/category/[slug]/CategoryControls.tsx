"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { BrandCount, SubcategoryCount } from "@/lib/categories";

interface Props {
  current: "featured" | "newest" | "price-asc" | "price-desc";
  brands?: BrandCount[];
  currentBrand?: string | null;
  subcategories?: SubcategoryCount[];
  currentSubcategory?: string | null;
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

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-ink/80">
      {subcategories.length > 0 ? (
        <div className="flex items-center gap-3">
          <label htmlFor="sub" className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
            Type
          </label>
          <select
            id="sub"
            value={currentSubcategory ?? ""}
            onChange={onFilterChange("sub")}
            disabled={pending}
            className="max-w-[200px] rounded-full border border-accent/20 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
        <div className="flex items-center gap-3">
          <label htmlFor="brand" className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
            Brand
          </label>
          <select
            id="brand"
            value={currentBrand ?? ""}
            onChange={onFilterChange("brand")}
            disabled={pending}
            className="max-w-[200px] rounded-full border border-accent/20 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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

      <div className="flex items-center gap-3">
        <label htmlFor="sort" className="text-[10px] uppercase tracking-[0.2em] text-ink/60">
          Sort
        </label>
        <select
          id="sort"
          value={current}
          onChange={onSortChange}
          disabled={pending}
          className="rounded-full border border-accent/20 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
