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
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#fef7ff" }}>
      <div
        className="bee-anim-floating absolute left-[15%] top-[20%] h-48 w-48 rounded-full blur-2xl"
        style={{ backgroundColor: "rgba(224,64,160,0.35)" }}
      />
      <div
        className="bee-anim-floating absolute right-[18%] top-[40%] h-64 w-64 rounded-full blur-2xl"
        style={{ backgroundColor: "rgba(124,82,170,0.30)", animationDelay: "0.6s" }}
      />
      <div
        className="bee-anim-floating absolute bottom-[12%] left-[35%] h-40 w-40 rounded-full blur-2xl"
        style={{ backgroundColor: "rgba(0,150,204,0.22)", animationDelay: "1.2s" }}
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
          <motion.div variants={fade} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              <span aria-hidden>🐝</span> London → Lebanon in 14 days
            </span>
          </motion.div>
          <motion.h1
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-5 font-serif text-[48px] font-bold leading-[1.05] text-ink sm:text-[56px]"
          >
            London&apos;s Finest, <span className="text-accent">Sweetly Delivered</span> To You
          </motion.h1>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 h-1.5 w-24 rounded-full"
            style={{ backgroundColor: "#e040a0" }}
          />
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 text-base leading-relaxed text-ink/70"
          >
            Luxury beauty, skincare and personal sourcing — curated in London, delivered to your door with a pop of joy in 10–14 days.
          </motion.p>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="#shop" className="btn-primary">
              Shop Now
            </Link>
            <a href={bespoke} target="_blank" rel="noreferrer" className="btn-outline">
              Request Bespoke
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
