"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { CategoryStat } from "@/lib/categories";
import type { BrandDirectoryEntry } from "@/lib/brands";
import { whatsappRequestLink } from "@/lib/links";
import HeroSection from "@/components/HeroSection";
import AutoVideo from "@/components/AutoVideo";
import SearchAutocomplete from "@/components/SearchAutocomplete";

interface Props {
  categories: CategoryStat[];
  brands: BrandDirectoryEntry[];
  orderCount?: number;
}

export default function HomeClient({ categories, brands, orderCount = 0 }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const bespoke = whatsappRequestLink();

  const grouped = brands.reduce<Record<string, BrandDirectoryEntry[]>>((acc, b) => {
    const l = b.brand[0]?.toUpperCase() ?? "#";
    if (!acc[l]) acc[l] = [];
    acc[l].push(b);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="flex flex-col">

      {/* ── 6 MOBILE / 5 DESKTOP: Search ── */}
      <section
        id="shop"
        className="order-6 lg:order-5 mx-auto w-full max-w-7xl px-4 pt-10 pb-2 sm:px-6 lg:px-8 lg:pt-16 lg:pb-0"
      >
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Search the edit</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">What are you looking for?</h2>
          <div className="mt-6">
            <SearchAutocomplete query={query} setQuery={setQuery} onSubmit={onSubmit} />
          </div>
        </div>
      </section>

      {/* ── 7 MOBILE / 6 DESKTOP: Brand directory ── */}
      <section className="order-7 lg:order-6 mx-auto w-full max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/60 bg-white/40 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Browse by brand</p>
              <h2 className="mt-1 font-serif text-xl text-ink">All Brands A–Z</h2>
            </div>
            <Link
              href="/brands"
              className="text-[11px] uppercase tracking-[0.2em] text-ink/60 hover:text-accent transition-colors"
            >
              Full directory →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveLetter(activeLetter === l ? null : l)}
                className={
                  "h-9 w-9 shrink-0 rounded-full border text-sm font-bold transition-all " +
                  (activeLetter === l
                    ? "border-accent bg-accent text-white"
                    : "border-ink/15 bg-white text-ink hover:border-accent hover:text-accent")
                }
              >
                {l}
              </button>
            ))}
          </div>
          {activeLetter && grouped[activeLetter] ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
              {grouped[activeLetter].map((b) => (
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
        </div>
      </section>

      {/* ── 1 MOBILE / 1 DESKTOP: Hero ── */}
      <div className="order-1 lg:order-1">
        <HeroSection orderCount={orderCount} />
      </div>

      {/* ── 4 MOBILE / 3 DESKTOP: Huda Beauty banner ── */}
      <div className="order-4 lg:order-3">
        <HudaBeautyBanner />
      </div>

      {/* ── 5 MOBILE / 4 DESKTOP: Shade Finder banner ── */}
      <div className="order-5 lg:order-4">
        <ShadeFinderBanner />
      </div>

      {/* ── 3 MOBILE / 7 DESKTOP: Category cards ── */}
      <div id="shop-categories" className="order-3 lg:order-7">
        <CategoryCards categories={categories} />
        <KBeautyTeaser />
      </div>

      <div className="order-8">
        <BespokeSection />
      </div>

      <div className="order-9">
        <WhySeasons />
      </div>
    </div>
  );
}

function ShadeFinderBanner() {
  return (
    <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <Link
        href="/shade-finder"
        className="group flex flex-col items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-white/60 p-7 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 sm:flex-row sm:text-left"
        style={{ background: "linear-gradient(110deg, #ffe6f4 0%, #f080c0 55%, #ffd6ee 100%)" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl" aria-hidden>🐝</span>
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
                <span aria-hidden className="mt-0.5">🐝</span>
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

function HeroVideo() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-6 rounded-[2.75rem] bg-accent/15 blur-3xl" aria-hidden />
      <AutoVideo
        src="/hero.mp4"
        poster="/hero-poster.jpg"
        wrapperClassName="overflow-hidden rounded-[2rem] border-2 border-white shadow-pop"
        videoClassName="aspect-video w-full bg-cream object-cover"
        label="Seasons by B brand film"
      />
    </div>
  );
}

function HudaBeautyBanner() {
  return (
    <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <Link
        href="/brand/huda-beauty"
        className="group relative block overflow-hidden rounded-[2rem] border border-white/10 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
        style={{ background: "linear-gradient(110deg, #1a0412 0%, #3d0a28 45%, #1a0412 100%)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://hudabeauty.com/cdn/shop/files/01-NEVER-TOO-MUCH-KIT_beacdb2c-e21d-4fcb-a492-a626103f2ca5.webp?v=1777873077"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-1/2 object-cover opacity-30 transition-opacity duration-500 group-hover:opacity-40"
          style={{ maskImage: "linear-gradient(to left, black 40%, transparent 100%)" }}
        />
        <div className="relative flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.36em]" style={{ color: "#e040a0", textShadow: "0 0 10px rgba(224,64,160,0.7)" }}>
              Now on Seasons
            </p>
            <h3 className="mt-2 font-serif text-2xl sm:text-3xl" style={{ color: "#f06ec0", textShadow: "0 0 8px rgba(224,64,160,0.5)" }}>
              Huda Beauty Collection
            </h3>
            <p className="mt-2 max-w-sm text-sm" style={{ color: "#d458a8" }}>
              Fragrances, makeup, kits and more — sourced from London, delivered to your door in Lebanon.
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-all group-hover:scale-[1.05]"
            style={{ background: "#e040a0", boxShadow: "0 4px 18px rgba(224,64,160,0.5)" }}
          >
            Shop Huda Beauty →
          </span>
        </div>
      </Link>
    </div>
  );
}

function KBeautyTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
      <Link
        href="/k-beauty"
        className="group relative block overflow-hidden rounded-[2rem] border border-white/60 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
        style={{
          background: "linear-gradient(135deg, #ffe0ef 0%, #f97db8 45%, #c94f92 80%, #8a2560 100%)"
        }}
      >
        <span aria-hidden className="pointer-events-none absolute right-6 top-4 text-6xl opacity-20">🌸</span>
        <span aria-hidden className="pointer-events-none absolute right-20 bottom-4 text-3xl opacity-15">🌸</span>
        <div className="relative flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.36em] text-white/70">New on Seasons</p>
            <h3 className="mt-2 font-serif text-2xl text-white sm:text-3xl">
              K-뷰티 — Korean Beauty
            </h3>
            <p className="mt-2 max-w-sm text-sm text-white/80">
              COSRX, Laneige, Dr. Jart+, Beauty of Joseon and more — sourced from Selfridges,
              delivered to Lebanon.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-accent shadow-lg transition-transform group-hover:scale-[1.05]">
            Explore K-Beauty 🌸
          </span>
        </div>
      </Link>
    </section>
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
