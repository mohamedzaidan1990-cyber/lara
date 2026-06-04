"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import { BeeSvg } from "./BeeMascot";
import { useCart } from "@/lib/cart";

export interface ProductCardData {
  // Present for catalogue products (links to the detail page). Live search
  // results have no id and fall back to the quick-order flow.
  id?: string;
  brand: string;
  name: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  category?: string;
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
  const [added, setAdded] = useState(false);
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const detailHref = product.id
    ? `/product/${product.id}`
    : "/order?" +
      new URLSearchParams({
        brand: product.brand,
        name: product.name,
        gbp: String(product.price_gbp),
        usd: String(product.price_usd)
      }).toString();

  const imgSrc = productImageSrc(product.image_url);
  const showImage = Boolean(imgSrc) && !imgFailed;

  function addToCart() {
    addItem({
      id: product.product_url || `${product.brand}|${product.name}`,
      brand: product.brand,
      name: product.name,
      price_usd: product.price_usd,
      price_gbp: product.price_gbp,
      image_url: product.image_url,
      product_url: product.product_url,
      category: product.category ?? ""
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <motion.article
      className="candy-card group flex flex-col border border-white/60 bg-white/60 p-4 shadow-soft"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={detailHref} className="relative block aspect-[3/4] w-full overflow-hidden rounded-[1.5rem] bg-surface-container">
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

        {/* Added-to-cart confirmation */}
        <AnimatePresence>
          {added ? (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: "rgba(255,253,245,0.82)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="bee-anim-success inline-block">
                <BeeSvg size={48} />
              </span>
              <span className="font-serif text-lg text-ink">Added! 🐝</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Link>

      <div className="mt-4 flex flex-1 flex-col px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/50">{product.brand}</p>
        <Link href={detailHref} className="mt-1.5 line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-accent">
          {product.name}
        </Link>
        <p className="mt-3 font-serif text-xl font-bold text-accent">{formatUsd(product.price_usd)}</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              addToCart();
              openCart();
            }}
            className="btn-primary w-full justify-center transition-transform hover:scale-[1.02]"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}
