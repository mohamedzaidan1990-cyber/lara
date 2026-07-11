import Link from "next/link";
import type { Metadata } from "next";
import { getBrandsForDirectory } from "@/lib/brands";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Brands — Seasons by B",
  description: "Browse all beauty and skincare brands available on Seasons by B, sourced from London and delivered to Lebanon.",
  alternates: { canonical: "https://www.seasonsbyb.co.uk/brands" },
};

export default async function BrandsPage() {
  const brands = await getBrandsForDirectory();

  // Group by first letter
  const grouped = new Map<string, typeof brands>();
  for (const b of brands) {
    const letter = b.brand[0].toUpperCase();
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter)!.push(b);
  }
  const letters = Array.from(grouped.keys()).sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">All Brands</span>
      </nav>

      <header className="mt-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-accent via-accent-500 to-secondary p-8 text-white shadow-soft sm:p-12">
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.32em] text-white/80">Shop the edit</p>
          <h1 className="relative mt-2 font-serif text-4xl font-bold sm:text-5xl">All Brands</h1>
          <p className="relative mt-3 text-sm text-white/85">
            {brands.length} brands curated from London, delivered to Lebanon.
          </p>
        </div>
      </header>

      {/* Letter jump links */}
      <div className="mt-8 flex flex-wrap gap-2">
        {letters.map((l) => (
          <a
            key={l}
            href={`#letter-${l}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-white text-xs font-bold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {l}
          </a>
        ))}
      </div>

      {/* A-Z groups */}
      <div className="mt-10 space-y-10">
        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`}>
            <h2 className="mb-4 font-serif text-3xl text-accent">{letter}</h2>
            <div className="flex flex-wrap gap-3">
              {grouped.get(letter)!.map((b) => (
                <Link
                  key={b.brand}
                  href={`/brand/${b.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-bold text-ink transition-all hover:border-accent hover:text-accent hover:shadow-soft"
                >
                  {b.brand}
                  <span className="text-[10px] font-normal text-ink/40">{b.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
