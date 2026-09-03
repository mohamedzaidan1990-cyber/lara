"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import type { TopBrand } from "@/lib/top-brands";

export default function BrandRail({ brands }: { brands: TopBrand[] }) {
  if (!brands || brands.length === 0) return null;

  return (
    <section id="shop-brands" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Our best sellers</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">Shop by Brand</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b, i) => (
          <motion.div
            key={b.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: Math.min(i, 5) * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/brand/${b.slug}`}
              className="group relative block overflow-hidden rounded-[2rem] border border-white/60 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-pop"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImageSrc(b.imageUrl)}
                  alt={b.brand}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <h3 className="absolute bottom-4 left-5 font-serif text-2xl text-white drop-shadow">
                  {b.brand}
                </h3>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
