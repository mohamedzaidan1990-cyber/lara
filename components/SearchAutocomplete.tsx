"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BeeSvg } from "./BeeMascot";
import type { BrandSuggestion, ProductSuggestion } from "@/app/api/search-suggestions/route";

interface Props {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

interface Suggestions {
  brands: BrandSuggestion[];
  products: ProductSuggestion[];
}

// A flattened, navigable list of dropdown rows.
type Row =
  | { kind: "brand"; brand: BrandSuggestion }
  | { kind: "product"; product: ProductSuggestion }
  | { kind: "search" };

export default function SearchAutocomplete({ query, setQuery, onSubmit }: Props) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestions>({ brands: [], products: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch (300ms) once the query is at least 2 characters.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions({ brands: [], products: [] });
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? (r.json() as Promise<Suggestions>) : { brands: [], products: [] }))
        .then((data) => {
          if (cancelled) return;
          setSuggestions({ brands: data.brands ?? [], products: data.products ?? [] });
          setActive(-1);
        })
        .catch(() => {
          if (!cancelled) setSuggestions({ brands: [], products: [] });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rows: Row[] = [
    ...suggestions.brands.map((brand) => ({ kind: "brand", brand }) as Row),
    ...suggestions.products.map((product) => ({ kind: "product", product }) as Row),
    ...(query.trim().length >= 2 ? [{ kind: "search" } as Row] : [])
  ];

  const hasDropdown = open && rows.length > 0;

  function selectBrand(b: BrandSuggestion) {
    setOpen(false);
    if (b.slug) router.push(`/category/${b.slug}?brand=${encodeURIComponent(b.brand)}`);
  }

  function selectProduct(p: ProductSuggestion) {
    setOpen(false);
    router.push(`/product/${p.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!hasDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      if (active >= 0 && active < rows.length) {
        const row = rows[active];
        if (row.kind === "brand") {
          e.preventDefault();
          selectBrand(row.brand);
        } else if (row.kind === "product") {
          e.preventDefault();
          selectProduct(row.product);
        }
        // "search" row falls through to form submit.
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto max-w-2xl">
      <form
        onSubmit={(e) => {
          setOpen(false);
          onSubmit(e);
        }}
        className="flex items-stretch gap-0 shadow-soft"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search across every category — e.g. Charlotte Tilbury"
          className="flex-1 border border-ink/15 bg-white px-5 py-4 text-base text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
          role="combobox"
          aria-expanded={hasDropdown}
          aria-autocomplete="list"
        />
        <button type="submit" className="btn-primary px-8 transition-transform hover:scale-[1.02]">
          Search
        </button>
      </form>

      {hasDropdown ? (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-[420px] overflow-auto border border-ink/15 bg-white text-left shadow-soft">
          {suggestions.brands.length > 0 ? (
            <li className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-ink/40">Brands</li>
          ) : null}
          {suggestions.brands.map((b) => {
            const idx = rows.findIndex((r) => r.kind === "brand" && r.brand.brand === b.brand);
            return (
              <li key={`b-${b.brand}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectBrand(b)}
                  onMouseEnter={() => setActive(idx)}
                  className={
                    "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink " +
                    (active === idx ? "bg-gold/15" : "hover:bg-ink/[0.03]")
                  }
                >
                  <BeeSvg size={15} />
                  <span className="font-medium">{b.brand}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-ink/40">{b.category}</span>
                </button>
              </li>
            );
          })}

          {suggestions.products.length > 0 ? (
            <li className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-ink/40">Products</li>
          ) : null}
          {suggestions.products.map((p) => {
            const idx = rows.findIndex((r) => r.kind === "product" && r.product.id === p.id);
            return (
              <li key={`p-${p.id}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectProduct(p)}
                  onMouseEnter={() => setActive(idx)}
                  className={
                    "flex w-full flex-col px-4 py-2.5 text-sm text-ink " +
                    (active === idx ? "bg-gold/15" : "hover:bg-ink/[0.03]")
                  }
                >
                  <span className="line-clamp-1">{p.name}</span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-ink/50">{p.brand}</span>
                </button>
              </li>
            );
          })}

          <li className="border-t border-ink/10">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                setOpen(false);
                onSubmit(e as unknown as React.FormEvent);
              }}
              onMouseEnter={() => setActive(rows.length - 1)}
              className={
                "w-full px-4 py-3 text-left text-sm text-accent " +
                (active === rows.length - 1 ? "bg-gold/15" : "hover:bg-ink/[0.03]")
              }
            >
              Search for &ldquo;{query.trim()}&rdquo; →
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
