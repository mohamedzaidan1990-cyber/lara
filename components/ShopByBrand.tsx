"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { BrandDirectoryEntry } from "@/lib/brands";
import type { TopBrand } from "@/lib/top-brands";
import SearchAutocomplete from "@/components/SearchAutocomplete";

interface Props {
  topBrands: TopBrand[];
  allBrands: BrandDirectoryEntry[];
}

export default function ShopByBrand({ topBrands, allBrands }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const grouped = allBrands.reduce<Record<string, BrandDirectoryEntry[]>>((acc, b) => {
    const l = b.brand[0]?.toUpperCase() ?? "#";
    (acc[l] ||= []).push(b);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort();

  // Always show one letter's brands so the sheer length of the catalogue is
  // visible, not just a row of letter buttons. Defaults to the first letter.
  const shownLetter = activeLetter ?? letters[0] ?? null;

  // "324 brands" → "300+" — round DOWN to the nearest 50 so we never over-claim.
  // The catalogue always carries 300+ brands; if the directory query comes back
  // short (a transient DB failure returns []), fall back to 300 rather than
  // showing a misleadingly small figure.
  const brandFloor = allBrands.length >= 100 ? Math.floor(allBrands.length / 50) * 50 : 300;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <section id="shop-brands" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Top Sellers</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">
            Shop <span className="text-accent">{brandFloor}+</span> Brands
          </h2>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-ink/50">
            Popular right now
          </p>
        </div>

        {/* Top-selling brand names (no images), followed by an explicit
            "and many more" link so these never read as the full range. */}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {topBrands.map((b) => (
            <Link
              key={b.slug}
              href={`/brand/${b.slug}`}
              className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            >
              {b.brand}
            </Link>
          ))}
          <Link
            href="/brands"
            className="rounded-full border border-accent bg-accent/10 px-4 py-2 text-sm font-bold text-accent transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-white"
          >
            + {brandFloor} more brands →
          </Link>
        </div>

        {/* Search + full A–Z directory */}
        <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-white/60 bg-white/40 p-6 backdrop-blur-sm sm:p-8">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-ink/50">
            Search for a brand, or browse A–Z
          </p>

          <div className="mt-4">
            <SearchAutocomplete query={query} setQuery={setQuery} onSubmit={onSubmit} />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveLetter(l)}
                className={
                  "h-9 w-9 shrink-0 rounded-full border text-sm font-bold transition-all " +
                  (shownLetter === l
                    ? "border-accent bg-accent text-white"
                    : "border-ink/15 bg-white text-ink hover:border-accent hover:text-accent")
                }
              >
                {l}
              </button>
            ))}
          </div>

          {shownLetter && grouped[shownLetter] ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-ink/10 pt-4">
              {grouped[shownLetter].map((b) => (
                <Link
                  key={b.brand}
                  href={`/brand/${b.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink transition-all hover:border-accent hover:text-accent"
                >
                  {b.brand}
                  <span className="text-[10px] font-normal text-ink/40">{b.count}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-6 text-center">
            <Link
              href="/brands"
              className="text-[11px] uppercase tracking-[0.2em] text-ink/60 transition-colors hover:text-accent"
            >
              Full brand directory →
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
