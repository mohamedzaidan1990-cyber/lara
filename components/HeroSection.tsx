"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";
import { whatsappRequestLink } from "@/lib/links";

// CSS-only animated fallback (also the loading state and the error fallback if
// WebGL / Three.js fails). Overlapping gold circles drifting on cream.
function CssHero() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#FFFDF5" }}>
      <div
        className="bee-anim-floating absolute left-[15%] top-[20%] h-48 w-48 rounded-full blur-2xl"
        style={{ backgroundColor: "rgba(244,211,96,0.55)" }}
      />
      <div
        className="bee-anim-floating absolute right-[18%] top-[40%] h-64 w-64 rounded-full blur-2xl"
        style={{ backgroundColor: "rgba(244,211,96,0.35)", animationDelay: "0.6s" }}
      />
      <div
        className="bee-anim-floating absolute bottom-[12%] left-[35%] h-40 w-40 rounded-full blur-2xl"
        style={{ backgroundColor: "rgba(201,161,42,0.3)", animationDelay: "1.2s" }}
      />
    </div>
  );
}

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <CssHero />
});

// If the WebGL scene throws at runtime, fall back to the CSS hero.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <CssHero /> : this.props.children;
  }
}

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

export default function HeroSection() {
  const bespoke = whatsappRequestLink();

  return (
    <section className="relative flex min-h-[88vh] flex-col lg:flex-row">
      {/* 3D / visual side */}
      <div className="relative h-[40vh] w-full lg:h-auto lg:min-h-[88vh] lg:w-[60%]">
        <SceneBoundary>
          <HeroScene />
        </SceneBoundary>
      </div>

      {/* Text side */}
      <div className="flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-[40%] lg:py-0">
        <motion.div
          className="max-w-md"
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.2, delayChildren: 0.1 }}
        >
          <motion.div variants={fade} transition={{ duration: 0.6 }} className="text-4xl">
            <span aria-hidden>🐝</span>
          </motion.div>
          <motion.h1
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-4 font-serif text-[52px] leading-[1.05] text-ink"
          >
            Seasons by B
          </motion.h1>
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-3 text-[18px] font-light text-ink/70"
          >
            London&apos;s Finest, Delivered to Your Door
          </motion.p>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 h-px w-24"
            style={{ backgroundColor: "#F4D360" }}
          />
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 text-sm leading-relaxed text-ink/70"
          >
            Luxury beauty, skincare and personal sourcing — curated in London, delivered to you in 10–14 days.
          </motion.p>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="#shop"
              className="inline-flex items-center justify-center rounded-none border border-accent bg-accent px-6 py-3 text-sm uppercase tracking-[0.18em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-soft"
            >
              Shop Now
            </Link>
            <a
              href={bespoke}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-none border border-gold bg-transparent px-6 py-3 text-sm uppercase tracking-[0.18em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-gold"
            >
              Request Bespoke
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
