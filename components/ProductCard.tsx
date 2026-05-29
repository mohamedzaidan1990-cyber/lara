"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import { BeeSvg } from "./BeeMascot";

export interface ProductCardData {
  brand: string;
  name: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

interface Props {
  product: ProductCardData;
  // Optional index for staggered entrance within a grid.
  index?: number;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

// Branded fallback when an image is missing or fails to load: cream ground with
// the brand initial set in Playfair Display gold.
function ImageFallback({ brand, name }: { brand: string; name: string }) {
  const initial = (brand || name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center font-serif"
      style={{ backgroundColor: "#FFFDF5", color: "#F4D360" }}
    >
      <span className="text-7xl leading-none">{initial}</span>
      <span className="mt-3 px-4 text-center text-[10px] uppercase tracking-[0.24em] text-ink/50">
        {brand || name}
      </span>
    </div>
  );
}

export default function ProductCard({ product, index = 0 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  const orderHref =
    "/order?" +
    new URLSearchParams({
      brand: product.brand,
      name: product.name,
      gbp: String(product.price_gbp),
      usd: String(product.price_usd)
    }).toString();

  const imgSrc = productImageSrc(product.image_url);
  const showImage = Boolean(imgSrc) && !imgFailed;

  return (
    <motion.article
      className="group flex flex-col"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink/[0.03] transition-shadow duration-300 group-hover:shadow-soft">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={`${product.brand} ${product.name}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <ImageFallback brand={product.brand} name={product.name} />
        )}
        <span
          className={
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] " +
            (product.deliverable_lebanon ? "bg-cream/95 text-ink" : "bg-ink/85 text-cream")
          }
        >
          {product.deliverable_lebanon ? (
            <>
              <BeeSvg size={14} />
              Ships Worldwide
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-cream/70" />
              Ask us
            </>
          )}
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[11px] uppercase tracking-[0.24em] text-ink/60">{product.brand}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink">{product.name}</p>
        <p className="mt-3 font-serif text-lg text-ink">{formatUsd(product.price_usd)}</p>

        <div className="mt-4 flex items-center gap-3">
          <Link href={orderHref} className="btn-primary flex-1 text-center transition-transform hover:scale-[1.02]">
            Order now
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
