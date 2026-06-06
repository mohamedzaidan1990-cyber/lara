"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import { useCart } from "@/lib/cart";
import { whatsappRequestLink } from "@/lib/links";
import { BeeSvg } from "@/components/BeeMascot";
import type { ProductDetail } from "@/lib/products";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

interface Props {
  product: ProductDetail;
}

export default function ProductDetailClient({ product }: Props) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const gallery = product.images.length > 0 ? product.images : product.image_url ? [product.image_url] : [];
  const [activeImage, setActiveImage] = useState(0);
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const activeSrc = productImageSrc(gallery[activeImage]);
  const showActive = Boolean(activeSrc) && !imgFailed[activeImage];

  const isComplexion = /foundation|concealer|tint|bb cream|cc cream|cushion|complexion/i.test(product.name);

  function addToCart(open: boolean) {
    addItem({
      id: product.product_url || product.id || `${product.brand}|${product.name}`,
      brand: product.brand,
      name: product.name,
      price_usd: product.price_usd,
      price_gbp: product.price_gbp,
      image_url: product.image_url ?? "",
      product_url: product.product_url ?? "",
      category: product.category ?? "",
      quantity: qty
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    if (open) openCart();
  }

  const bespokeMessage = `Hi Seasons by B, I'd like to request a specific variant of: ${product.brand} — ${product.name}. `;
  const bespokeHref = whatsappRequestLink(bespokeMessage);

  const description =
    `The ${product.name} by ${product.brand} — a ${product.category.toLowerCase()} piece curated by Seasons by B ` +
    `and sourced from London's finest luxury retailers, delivered door to door in Lebanon.`;

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      {/* ---------- Left: gallery ---------- */}
      <div>
        <div
          className="relative aspect-[3/4] w-full overflow-hidden bg-ink/[0.03]"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          {showActive ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeSrc}
              alt={`${product.brand} ${product.name}`}
              className="h-full w-full object-cover transition-transform duration-300"
              style={zoom ? { transform: "scale(1.6)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              onError={() => setImgFailed((p) => ({ ...p, [activeImage]: true }))}
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center font-serif"
              style={{ backgroundColor: "#FFFDF5", color: "#F4D360" }}
            >
              <span className="text-8xl leading-none">
                {(product.brand || product.name || "?").trim().charAt(0).toUpperCase()}
              </span>
              <span className="mt-3 px-4 text-center text-[11px] uppercase tracking-[0.24em] text-ink/50">
                {product.brand}
              </span>
            </div>
          )}

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
                  <BeeSvg size={56} />
                </span>
                <span className="font-serif text-xl text-ink">Added! 🐝</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {gallery.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {gallery.map((src, i) => {
              const thumb = productImageSrc(src);
              const active = i === activeImage;
              return (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={
                    "relative h-20 w-16 overflow-hidden border transition-colors " +
                    (active ? "border-accent" : "border-ink/15 hover:border-ink/40")
                  }
                  aria-label={`View image ${i + 1}`}
                >
                  {thumb && !imgFailed[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-cream font-serif text-gold">
                      {(product.brand || "?").charAt(0)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ---------- Right: details ---------- */}
      <div className="flex flex-col">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">{product.brand}</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">{product.name}</h1>
        <p className="mt-4 font-serif text-3xl text-ink">{formatUsd(product.price_usd)}</p>

        <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink/70">{description}</p>

        {isComplexion ? (
          <Link
            href="/shade-finder"
            className="mt-6 flex items-center justify-center gap-2 rounded-md border border-gold/50 bg-gold/15 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold/25"
          >
            Not sure about your shade? Try our Shade Finder 🐝
          </Link>
        ) : null}

        {/* Quantity */}
        <div className="mt-8 flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Quantity</span>
          <div className="flex items-center border border-ink/15">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center text-lg text-ink hover:bg-ink/[0.04]"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-10 text-center text-sm text-ink">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              className="flex h-10 w-10 items-center justify-center text-lg text-ink hover:bg-ink/[0.04]"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => addToCart(true)}
            className="w-full justify-center rounded-full px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-accent/20 transition-transform hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "#e040a0" }}
          >
            Add to Cart
          </button>
          <a
            href={bespokeHref}
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-full border-2 border-accent/25 px-6 py-3.5 text-center text-xs font-bold uppercase tracking-[0.16em] text-accent transition-all hover:scale-[1.02] hover:bg-accent/5"
          >
            Request via Bespoke
          </a>
        </div>

        {/* Delivery / returns */}
        <dl className="mt-8 space-y-3 border-t border-ink/10 pt-6 text-sm text-ink/70">
          <div className="flex items-start gap-3">
            <span aria-hidden>📦</span>
            <span>
              <strong className="text-ink">Delivery</strong> — 10–14 working days to Lebanon, tracked. In-country
              delivery is $3–5 paid to the driver on arrival (not in your invoice).
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span aria-hidden>↩️</span>
            {product.category === "Fragrance" ? (
              <span>
                <strong className="text-ink">Non-returnable</strong> — Selfridges&rsquo; fragrance policy is strict, so
                perfume orders are final.
              </span>
            ) : (
              <span>
                <strong className="text-ink">Returns</strong> — 14 day returns policy.
              </span>
            )}
          </div>
          <div className="flex items-start gap-3">
            <BeeSvg size={16} />
            <span>Curated in London and sourced personally for you.</span>
          </div>
        </dl>
      </div>
    </div>
  );
}
