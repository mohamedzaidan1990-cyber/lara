"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import { BeeSvg } from "./BeeMascot";
import { useCart } from "@/lib/cart";
import { getPromo } from "@/lib/promotions";
import { isShadeRelevant } from "@/lib/shade-options";

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
  subcategory?: string | null;
  light_shade_image_url?: string | null;
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

async function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasWrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  let drawn = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + (line ? " " : "") + words[i];
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      if (drawn >= maxLines - 1) {
        ctx.fillText(line.trim() + "…", x, curY);
        return curY + lineHeight;
      }
      ctx.fillText(line.trim(), x, curY);
      line = words[i];
      curY += lineHeight;
      drawn++;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, curY);
  return curY + lineHeight;
}

async function generateStoryImage(
  product: ProductCardData,
  imgSrc: string | null
): Promise<Blob | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFDF5";
    ctx.fillRect(0, 0, 1080, 1920);

    // Product photo (cover top 62% of canvas)
    const IMG_H = 1200;
    if (imgSrc) {
      try {
        const img = await loadCanvasImage(imgSrc);
        const scale = Math.max(1080 / img.width, IMG_H / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (1080 - dw) / 2, 0, dw, dh);
      } catch {
        ctx.fillStyle = "#FFF0F8";
        ctx.fillRect(0, 0, 1080, IMG_H);
        ctx.font = "bold 260px Georgia, serif";
        ctx.fillStyle = "#F4D360";
        ctx.textAlign = "center";
        ctx.fillText((product.brand || "S").charAt(0).toUpperCase(), 540, 760);
        ctx.textAlign = "left";
      }
    } else {
      ctx.fillStyle = "#FFF0F8";
      ctx.fillRect(0, 0, 1080, IMG_H);
      ctx.font = "bold 260px Georgia, serif";
      ctx.fillStyle = "#F4D360";
      ctx.textAlign = "center";
      ctx.fillText((product.brand || "S").charAt(0).toUpperCase(), 540, 760);
      ctx.textAlign = "left";
    }

    // Gradient overlay: image fades to cream
    const grad = ctx.createLinearGradient(0, 820, 0, 1260);
    grad.addColorStop(0, "rgba(255,253,245,0)");
    grad.addColorStop(1, "rgba(255,253,245,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    const PAD = 80;

    // Brand
    ctx.font = "bold 36px -apple-system, Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#c94f92";
    ctx.fillText(product.brand.toUpperCase(), PAD, 1310);

    // Product name (max 3 lines)
    ctx.font = "600 52px Georgia, serif";
    ctx.fillStyle = "#1a1008";
    const afterName = canvasWrapText(ctx, product.name, PAD, 1378, 1080 - PAD * 2, 66, 3);

    // Price
    const priceY = Math.min(afterName + 50, 1700);
    ctx.font = "bold 82px Georgia, serif";
    ctx.fillStyle = "#c94f92";
    ctx.fillText(formatUsd(product.price_usd), PAD, priceY);

    // Tagline
    ctx.font = "30px -apple-system, Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#999";
    ctx.fillText("London beauty · Delivered to Lebanon", PAD, priceY + 50);

    // Pink CTA bar at bottom
    const barCY = 1860;
    const barH = 58;
    const barR = 29;
    const bx = PAD, bw = 1080 - PAD * 2, by = barCY - barH / 2;
    ctx.fillStyle = "#c94f92";
    ctx.beginPath();
    ctx.moveTo(bx + barR, by);
    ctx.lineTo(bx + bw - barR, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + barR);
    ctx.lineTo(bx + bw, by + barH - barR);
    ctx.quadraticCurveTo(bx + bw, by + barH, bx + bw - barR, by + barH);
    ctx.lineTo(bx + barR, by + barH);
    ctx.quadraticCurveTo(bx, by + barH, bx, by + barH - barR);
    ctx.lineTo(bx, by + barR);
    ctx.quadraticCurveTo(bx, by, bx + barR, by);
    ctx.closePath();
    ctx.fill();

    ctx.font = "bold 26px -apple-system, Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("seasonsbyb.co.uk  🐝", 540, barCY + 9);
    ctx.textAlign = "left";

    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
  } catch {
    return null;
  }
}

function ShareButton({
  product,
  detailHref,
  imgSrc
}: {
  product: ProductCardData;
  detailHref: string;
  imgSrc: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buildingStory, setBuildingStory] = useState(false);
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

  function waHref() {
    const url = getUrl();
    const text = `${product.brand} — ${product.name}\n${formatUsd(product.price_usd)} · Seasons by B 🐝\n${url}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  async function nativeShare() {
    setOpen(false);
    const url = getUrl();
    try {
      await navigator.share({
        title: `${product.brand} — ${product.name}`,
        text: `${formatUsd(product.price_usd)} · London beauty, delivered to Lebanon 🐝`,
        url
      });
    } catch { /* cancelled */ }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(getUrl()); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1400);
  }

  async function shareStory() {
    setOpen(false);
    setBuildingStory(true);
    try {
      const blob = await generateStoryImage(product, imgSrc);
      if (!blob) return;
      const file = new File([blob], "seasons-story.jpg", { type: "image/jpeg" });
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file] });
      } else {
        // Desktop: download the story card for manual upload
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "seasons-story.jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch { /* cancelled */ }
    setBuildingStory(false);
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Share product"
        onClick={() => setOpen((v) => !v)}
        disabled={buildingStory}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-white text-ink/60 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {buildingStory ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <ShareIcon />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 z-50 w-52 overflow-hidden rounded-2xl border border-accent/15 bg-white shadow-pop"
          >
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/40">Share via</p>
            {canNativeShare ? (
              <button
                type="button"
                onClick={nativeShare}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/8 hover:text-accent"
              >
                <span className="text-base">↗️</span> Share…
              </button>
            ) : (
              <a
                href={waHref()}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/8 hover:text-accent"
              >
                <span className="text-base">💬</span> WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={shareStory}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/8 hover:text-accent"
            >
              <span className="text-base">📸</span> Instagram Story
            </button>
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

  const imgSrc = productImageSrc(product.light_shade_image_url ?? product.image_url);
  const showImage = Boolean(imgSrc) && !imgFailed;
  const promo = getPromo(product.id);

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
        {promo ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white shadow">
            ✦ {promo.label}
          </span>
        ) : !product.deliverable_lebanon ? (
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
        {promo ? (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-xl font-bold text-accent">{formatUsd(product.price_usd)}</span>
            <span className="text-sm text-ink/40 line-through">{formatUsd(promo.compareAtUsd)}</span>
          </div>
        ) : (
          <p className="mt-3 font-serif text-xl font-bold text-accent">{formatUsd(product.price_usd)}</p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {product.id && product.light_shade_image_url && isShadeRelevant(product.subcategory ?? null, product.name) ? (
            <Link
              href={`/product/${product.id}#shade-picker-section`}
              className="btn-primary flex-1 justify-center transition-transform hover:scale-[1.02]"
            >
              Select Shade
            </Link>
          ) : (
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
          )}
          <ShareButton product={product} detailHref={detailHref} imgSrc={imgSrc} />
        </div>
      </div>
    </motion.article>
  );
}
