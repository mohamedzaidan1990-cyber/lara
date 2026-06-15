import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  KBEAUTY_SLUG_MAP,
  KBEAUTY_ROSTER,
  getKBeautyCounts,
  getFeaturedKBeauty,
  getKBeautyBrands
} from "@/lib/kbeauty";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "K-Beauty — Seasons by B",
  description:
    "Korean beauty from Laneige, Dr. Jart+, COSRX, Beauty of Joseon and more — sourced from Selfridges London, delivered to Lebanon."
};

const ROUTINE_STEPS = [
  {
    step: "01",
    title: "Double Cleanse",
    brands: "COSRX, Beauty of Joseon",
    desc: "Oil cleanser + water cleanser — the foundation of Korean skincare."
  },
  {
    step: "02",
    title: "Tone & Essence",
    brands: "Laneige, Haruharu Wonder",
    desc: "Layer lightweight toners to drench skin in hydration."
  },
  {
    step: "03",
    title: "Serum",
    brands: "Anua, Skin1004, COSRX",
    desc: "Targeted actives: snail, centella, niacinamide, retinal."
  },
  {
    step: "04",
    title: "Moisturise & SPF",
    brands: "Beauty of Joseon, Round Lab",
    desc: "Seal it in. Korean SPF formulas are the world's best — never skip."
  }
];

export default async function KBeautyPage() {
  const [counts, featured, brands] = await Promise.all([
    getKBeautyCounts(),
    getFeaturedKBeauty(12),
    getKBeautyBrands(["Skincare", "Makeup", "Haircare", "Beauty tools"])
  ]);

  const subcats = Object.entries(KBEAUTY_SLUG_MAP);

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #ffe0ef 0%, #f97db8 40%, #c94f92 70%, #8a2560 100%)"
        }}
        className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
      >
        <span aria-hidden className="pointer-events-none absolute right-8 top-8 text-7xl opacity-20">
          🌸
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-8 left-12 text-5xl opacity-15">
          🌸
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-12 right-1/4 text-4xl opacity-10">
          🌸
        </span>

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">새로운 뷰티 루틴</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight text-white sm:text-6xl lg:text-7xl">
            K-뷰티
          </h1>
          <p className="mt-2 font-serif text-2xl text-white/90 sm:text-3xl">Korean Beauty</p>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            The world&apos;s most innovative skincare and makeup — COSRX, Laneige, Dr. Jart+,
            Beauty of Joseon and more. Sourced from Selfridges London, delivered to Lebanon.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/k-beauty/skincare"
              className="rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-accent shadow-lg transition-transform hover:scale-105"
            >
              Shop K-Skincare 🌿
            </Link>
            <Link
              href="/k-beauty/makeup"
              className="rounded-full border border-white/60 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all hover:bg-white/20"
            >
              Shop K-Makeup 🌸
            </Link>
          </div>
        </div>
      </section>

      {/* Sub-category cards */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Browse by</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">K-Beauty Categories</h2>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {subcats.map(([slug, def]) => (
            <Link
              key={slug}
              href={`/k-beauty/${slug}`}
              className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-[1.5rem] border border-accent/20 bg-white/80 p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-pop"
            >
              <span className="text-3xl">{def.emoji}</span>
              <div>
                <p className="font-serif text-lg text-ink group-hover:text-accent">{def.label}</p>
                {(counts[slug] ?? 0) > 0 ? (
                  <p className="mt-1 text-[11px] text-ink/50">{counts[slug]} products</p>
                ) : null}
              </div>
              <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/60 group-hover:text-accent">
                Shop →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 ? (
        <section className="border-t border-accent/10 bg-cream/50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-accent">K-Beauty edit</p>
                <h2 className="mt-2 font-serif text-3xl text-ink">Featured Products</h2>
              </div>
              <Link
                href="/k-beauty/skincare"
                className="text-xs uppercase tracking-[0.2em] text-ink/60 hover:text-accent"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {featured.slice(0, 12).map((p, i) => (
                <div key={p.id} className="relative">
                  <span
                    className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white"
                    style={{ background: "#c94f92" }}
                  >
                    K-Beauty
                  </span>
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4-step routine */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-accent">The method</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">The K-Beauty Routine</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-ink/60">
              The reason Korean skin is different. Four steps, layered with intention.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROUTINE_STEPS.map((s) => (
              <div
                key={s.step}
                className="rounded-[1.5rem] border border-accent/15 bg-white/90 p-6 shadow-soft"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #f97db8, #c94f92)" }}
                >
                  {s.step}
                </span>
                <h3 className="mt-4 font-serif text-xl text-ink">{s.title}</h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-accent">{s.brands}</p>
                <p className="mt-2 text-sm text-ink/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand roster */}
      <section className="border-t border-accent/10 bg-cream py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-accent">The roster</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">K-Beauty Brands We Carry</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(brands.length > 0 ? brands.map((b) => b.brand) : KBEAUTY_ROSTER).map((brand) => (
              <span
                key={brand}
                className="rounded-full border border-accent/30 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-ink shadow-soft"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
