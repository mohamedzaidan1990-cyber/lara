"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

function ShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ShareButton({ product, detailHref }: { product: ProductCardData; detailHref: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function getUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.seasonsbyb.co.uk";
    return origin + detailHref;
  }

  async function handleShare() {
    const url = getUrl();
    const title = `${product.brand} — ${product.name}`;
    const text = `${formatUsd(product.price_usd)} · London beauty, delivered to Lebanon 🐝`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    } else {
      setOpen((v) => !v);
    }
  }

  function waHref() {
    const url = getUrl();
    const text = `${product.brand} — ${product.name}\n${formatUsd(product.price_usd)} · Seasons by B 🐝\n${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(getUrl()); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1400);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Share product"
        onClick={handleShare}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-white text-ink/60 transition-colors hover:border-accent hover:text-accent"
      >
        <ShareIcon />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 z-50 w-44 overflow-hidden rounded-2xl border border-accent/15 bg-white shadow-pop"
          >
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/40">Share via</p>
            <a
              href={waHref()}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/8 hover:text-accent"
            >
              <span className="text-base">💬</span> WhatsApp
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-3 px-4 py-2.5 pb-3 text-sm font-medium text-ink transition-colors hover:bg-accent/8 hover:text-accent"
            >
              <span className="text-base">{copied ? "✓" : "🔗"}</span>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
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
        {!product.deliverable_lebanon ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cream">
            <span className="h-1.5 w-1.5 rounded-full bg-cream/70" />
            Ask us
          </span>
        ) : null}

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

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              addToCart();
              openCart();
            }}
            className="btn-primary flex-1 justify-center transition-transform hover:scale-[1.02]"
          >
            Add to Cart
          </button>
          <ShareButton product={product} detailHref={detailHref} />
        </div>
      </div>
    </motion.article>
  );
}
