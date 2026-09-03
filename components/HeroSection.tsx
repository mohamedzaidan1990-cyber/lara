"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { whatsappRequestLink } from "@/lib/links";

// Swap this constant to change the hero image (drop a file in /public).
const HERO_IMAGE = "/hero-home.jpg";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSection({ orderCount = 0 }: { orderCount?: number }) {
  const bespoke = whatsappRequestLink();

  return (
    <section className="relative flex min-h-[88vh] w-full items-center justify-center overflow-hidden bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/25" />

      <motion.div
        className="relative z-10 mx-auto max-w-2xl px-6 py-24 text-center"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.15, delayChildren: 0.1 }}
      >
        <motion.p
          variants={fade}
          transition={{ duration: 0.6 }}
          className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/80"
        >
          🐝 London → Lebanon in 14 days
        </motion.p>
        <motion.h1
          variants={fade}
          transition={{ duration: 0.6 }}
          className="mt-5 font-serif text-[40px] font-bold leading-[1.08] text-white sm:text-[56px]"
        >
          London&apos;s Finest, <span className="text-accent">Sweetly Delivered</span> To You
        </motion.h1>
        <motion.p
          variants={fade}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/85"
        >
          Luxury beauty, skincare and personal sourcing — curated in London, delivered to your door
          with a pop of joy in 10–14 days.
        </motion.p>
        <motion.div
          variants={fade}
          transition={{ duration: 0.6 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="#shop-brands" className="btn-primary">
            Discover
          </Link>
          <a href={bespoke} target="_blank" rel="noreferrer" className="btn-outline border-white/60 text-white">
            Request Bespoke
          </a>
        </motion.div>
        {orderCount > 0 ? (
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-7 inline-flex items-center gap-2 text-sm text-white/80"
          >
            <span aria-hidden className="inline-flex h-2 w-2 rounded-full bg-accent" />
            <strong className="text-white">{orderCount}+ orders</strong> delivered to Lebanon — and counting
          </motion.p>
        ) : null}
      </motion.div>
    </section>
  );
}
