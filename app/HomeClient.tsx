"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import type { CategoryStat } from "@/lib/categories";
import { whatsappRequestLink } from "@/lib/links";
import HeroSection from "@/components/HeroSection";
import AutoVideo from "@/components/AutoVideo";
import BeeLoader from "@/components/BeeLoader";
import { BeeMascot } from "@/components/BeeMascot";
import SearchAutocomplete from "@/components/SearchAutocomplete";

interface SearchProduct extends ProductCardData {
  category?: string;
}

interface Props {
  categories: CategoryStat[];
}

export default function HomeClient({ categories }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [query]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, category: "All" })
      });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { products: SearchProduct[] };
      setResults(data.products ?? []);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <HeroSection />

      <ShadeFinderBanner />

      <section id="shop" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <SearchBar query={query} setQuery={setQuery} onSubmit={runSearch} />
      </section>

      {results !== null ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-2xl text-ink">
              {loading ? "Searching…" : `Results for "${query}"`}
            </h2>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
              onClick={() => {
                setResults(null);
                setQuery("");
              }}
            >
              Clear
            </button>
          </div>

          {loading ? <BeeLoader fullScreen={false} /> : null}
          {error ? (
            <p className="rounded border border-accent/40 bg-accent/5 p-4 text-sm text-accent-700">{error}</p>
          ) : null}
          {!loading && results.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded border border-ink/10 bg-ink/[0.02] p-12 text-center">
              <BeeMascot variant="floating" />
              <p className="text-sm text-ink/60">
                No products matched. Try a different search — or send our bee a bespoke request below.
              </p>
            </div>
          ) : null}
          {!loading && results.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((p, i) => (
                <ProductCard key={(p.product_url || p.name) + i} product={p} index={i} />
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <CategoryCards categories={categories} />
      )}

      <BespokeSection />

      <WhySeasons />
    </div>
  );
}

interface SearchBarProps {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function SearchBar({ query, setQuery, onSubmit }: SearchBarProps) {
  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Search the edit</p>
      <h2 className="mt-2 font-serif text-3xl text-ink">What are you looking for?</h2>
      <div className="mt-6">
        <SearchAutocomplete query={query} setQuery={setQuery} onSubmit={onSubmit} />
      </div>
    </div>
  );
}

function ShadeFinderBanner() {
  return (
    <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <Link
        href="/shade-finder"
        className="group flex flex-col items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-white/60 p-7 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 sm:flex-row sm:text-left"
        style={{ background: "linear-gradient(110deg, #ffe6f4 0%, #f080c0 55%, #ffd6ee 100%)" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl" aria-hidden>
            🐝
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-ink/60">AI Shade Finder</p>
            <p className="mt-1 font-serif text-xl text-ink sm:text-2xl">
              Not sure which shade is right for you?
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-accent shadow-lg transition-transform group-hover:scale-[1.05]">
          Try our Shade Finder →
        </span>
      </Link>
    </div>
  );
}

function CategoryCards({ categories }: { categories: CategoryStat[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Shop the edit</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">By category</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/category/${cat.slug}`}
              className="group relative block overflow-hidden rounded-[2rem] border border-white/60 bg-white/60 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-pop"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.defaultImage}
                  alt={cat.label}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
                <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink">
                  {cat.count} {cat.count === 1 ? "product" : "products"}
                </span>
              </div>
              <div className="p-5">
                <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Category</p>
                <h3 className="mt-1 font-serif text-2xl text-ink group-hover:text-accent">{cat.label}</h3>
                <p className="mt-2 text-sm text-ink/70">{cat.blurb}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/80 group-hover:text-accent">
                  Shop {cat.label} →
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function BespokeSection() {
  const wa = whatsappRequestLink();
  const features = [
    { t: "Bags, watches & accessories", d: "Gucci, Loewe, Burberry, Bottega Veneta" },
    { t: "Rare finds", d: "Limited editions and sold-out pieces" },
    { t: "Gift sourcing", d: "Special occasions and curated selections" }
  ];

  return (
    <section className="border-y border-ink/10 bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Personal sourcing</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink/70 sm:text-base">
            Bags, rare finds, limited editions, sold-out pieces — tell us exactly what you want and we&apos;ll source
            it personally from London&apos;s finest boutiques.
          </p>
          <ul className="mt-7 space-y-3">
            {features.map((f) => (
              <li key={f.t} className="flex items-start gap-3 text-sm text-ink/80">
                <span aria-hidden className="mt-0.5">
                  🐝
                </span>
                <span>
                  <strong className="text-ink">{f.t}</strong> — {f.d}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <a href={wa} target="_blank" rel="noreferrer" className="btn-gold">
              Request Bespoke →
            </a>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink/50">
              We typically respond within 2 hours
            </p>
          </div>
        </motion.div>

        <HeroVideo />
      </div>
    </section>
  );
}

// Brand film for the personal-sourcing section. Autoplays on loop; tap the
// speaker to play its sound (replaces the old floating-accessory collage).
function HeroVideo() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* soft glow behind the film */}
      <div className="absolute -inset-6 rounded-[2.75rem] bg-accent/15 blur-3xl" aria-hidden />
      <AutoVideo
        src="/hero.mp4"
        wrapperClassName="overflow-hidden rounded-[2rem] border-2 border-white shadow-pop"
        videoClassName="aspect-video w-full bg-cream object-cover"
        label="Seasons by B brand film"
      />
    </div>
  );
}

function WhySeasons() {
  const items = [
    { icon: "🐝", title: "Curated in London", body: "Hand-picked from London's finest luxury retailers." },
    { icon: "📦", title: "Delivered to your door", body: "10–14 working days, tracked shipping." },
    { icon: "💬", title: "Personal service", body: "Instagram & email support throughout your order." }
  ];
  return (
    <section className="border-t border-ink/10 bg-gold/15">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6 lg:px-8">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            className="text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold bg-cream text-2xl">
              <span aria-hidden>{item.icon}</span>
            </div>
            <h3 className="mt-5 font-serif text-2xl text-ink">{item.title}</h3>
            <p className="mt-3 text-sm text-ink/70">{item.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
