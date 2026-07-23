"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import { HUDA_BLUSH_PROMO } from "@/lib/huda-blush-promo";

const IMG = productImageSrc(HUDA_BLUSH_PROMO.gift.image_url);

// Decorative colour-block circles behind the product shot — echoes the
// blush-trio reference image's soft round backdrop without needing a
// composited asset. Same visual language as the blush shades themselves.
function ColorBlobs() {
  return (
    <>
      <span
        aria-hidden
        className="absolute left-[6%] top-[10%] h-40 w-40 rounded-full opacity-70 blur-[2px] sm:h-56 sm:w-56"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffd4e8, #f5a8c8)" }}
      />
      <span
        aria-hidden
        className="absolute right-[10%] top-[4%] h-28 w-28 rounded-full opacity-60 blur-[2px] sm:h-40 sm:w-40"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffb8d4, #e8709e)" }}
      />
      <span
        aria-hidden
        className="absolute bottom-[6%] left-[22%] h-24 w-24 rounded-full opacity-60 blur-[2px] sm:h-32 sm:w-32"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffcfa8, #f0946a)" }}
      />
    </>
  );
}

// variant="homepage": full poster for the homepage.
// variant="brand": condensed banner for the Huda Beauty brand page.
export default function HudaBlushPromo({ variant = "homepage" }: { variant?: "homepage" | "brand" }) {
  if (variant === "brand") {
    return (
      <Link
        href="#huda-blush-promo-details"
        className="group relative mt-5 flex flex-col items-center gap-4 overflow-hidden rounded-[2rem] border border-white/60 p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-0.5 sm:flex-row sm:justify-between sm:p-7 sm:text-left"
        style={{ background: "linear-gradient(110deg, #fff1f6 0%, #ffe1ec 55%, #fff6ee 100%)" }}
      >
        <ColorBlobs />
        <div className="relative flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMG} alt="" className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-md sm:h-20 sm:w-20" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">While stocks last</p>
            <p className="mt-1 font-serif text-lg text-ink sm:text-xl">
              Spend $100 on Huda Beauty, get a blush <span className="text-accent">free</span>
            </p>
          </div>
        </div>
        <span className="relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform group-hover:scale-[1.05]">
          Shop Huda Beauty →
        </span>
      </Link>
    );
  }

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/60 shadow-soft"
        style={{ background: "linear-gradient(135deg, #fff6ee 0%, #ffeaf2 55%, #ffe1ec 100%)" }}
      >
        <ColorBlobs />
        <div className="relative flex flex-col items-center gap-8 p-8 sm:p-12 lg:flex-row lg:justify-between lg:gap-12 lg:p-16">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              <span aria-hidden>🐝</span> While stocks last
            </span>
            <h2 className="mt-5 max-w-lg font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Buy $100 of Huda Beauty. <span className="text-accent">The blush is on us.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/70 sm:text-base">
              Spend $100 or more on Huda Beauty and we&apos;ll drop a full-size Blush Filter Liquid Blush into your
              order — free, no code needed. Shade of your choice, selected via Instagram after checkout.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/brand/huda-beauty" className="btn-primary">
                Shop Huda Beauty →
              </Link>
            </div>
          </div>

          <div className="relative shrink-0">
            <div className="absolute -inset-4 rounded-full bg-white/40 blur-2xl" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG}
              alt="Huda Beauty Blush Filter Liquid Blush — the free gift"
              className="relative h-56 w-56 rounded-[2rem] border-4 border-white object-cover shadow-pop sm:h-64 sm:w-64"
            />
            <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg">
              🎁 Free with $100 spend
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
