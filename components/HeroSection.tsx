"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AutoVideo from "@/components/AutoVideo";
import { whatsappRequestLink } from "@/lib/links";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

export default function HeroSection({ orderCount = 0 }: { orderCount?: number }) {
  const bespoke = whatsappRequestLink();

  return (
    <section className="relative flex min-h-[92vh] w-full items-end overflow-hidden bg-ink sm:items-center">
      <AutoVideo
        src="/hero-top.mp4"
        poster="/hero-top-poster.jpg"
        wrapperClassName="absolute inset-0 hero-kenburns"
        videoClassName="h-full w-full object-cover"
        showSoundToggle={false}
        label="Seasons by B brand film"
      />
      {/* scrim so the headline stays legible over the footage */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />

      <div className="relative z-10 w-full px-6 pt-24 pb-12 sm:px-10 lg:px-16 lg:pb-20">
        <motion.div
          className="max-w-md"
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.2, delayChildren: 0.1 }}
        >
          <motion.div variants={fade} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              <span aria-hidden>🐝</span> London → Lebanon in 14 days
            </span>
          </motion.div>
          <h1 className="mt-5 font-serif text-[48px] font-bold leading-[1.05] text-white sm:text-[56px]">
            {[
              { t: "London's" },
              { t: "Finest," },
              { t: "Sweetly", accent: true },
              { t: "Delivered", accent: true },
              { t: "To" },
              { t: "You" }
            ].map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className={"mr-[0.26em] inline-block " + (w.accent ? "text-accent" : "")}
              >
                {w.t}
              </motion.span>
            ))}
          </h1>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 h-1.5 w-24 rounded-full"
            style={{ backgroundColor: "#e040a0" }}
          />
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 text-base leading-relaxed text-white/80"
          >
            Luxury beauty, skincare and personal sourcing — curated in London, delivered to your door with a pop of joy in 10–14 days.
          </motion.p>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="#shop-categories" className="btn-primary">
              Shop Now
            </Link>
            <a href={bespoke} target="_blank" rel="noreferrer" className="btn-outline">
              Request Bespoke
            </a>
          </motion.div>
          {orderCount > 0 ? (
            <motion.p
              variants={fade}
              transition={{ duration: 0.6 }}
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/80"
            >
              <span aria-hidden className="inline-flex h-2 w-2 rounded-full bg-accent" />
              <strong className="text-white">{orderCount}+ orders</strong> delivered to Lebanon — and counting
            </motion.p>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
