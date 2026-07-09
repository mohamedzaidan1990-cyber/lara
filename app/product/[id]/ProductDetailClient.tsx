"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { productImageSrc } from "@/lib/images";
import { useCart } from "@/lib/cart";
import { whatsappRequestLink } from "@/lib/links";
import { BeeSvg } from "@/components/BeeMascot";
import type { ProductDetail } from "@/lib/products";
import {
  COMPLEXION_SUBCATEGORIES,
  isShadeRelevant,
  sortShadesLightFirst,
  type ShadeOption
} from "@/lib/shade-options";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

interface PromoGift {
  id: string;
  brand: string;
  name: string;
  price_usd: number;
  price_gbp: number;
  image_url: string | null;
  product_url: string | null;
  category: string;
}

interface Props {
  product: ProductDetail;
  promoGift?: PromoGift | null;
}

interface ProductVariant {
  shade_name: string;
  shade_image_url: string | null;
  swatch_url: string | null;
  sort_order: number;
}

// Shade/colour picker. Selection is REQUIRED for shade-relevant products —
// the add-to-cart button is blocked until a shade is chosen.
function ShadePicker({
  productId,
  label,
  selected,
  onSelect,
  error
}: {
  productId: string;
  label: string;
  selected: string | null;
  onSelect: (name: string | null, imageUrl?: string | null) => void;
  error: boolean;
}) {
  const [variants, setVariants] = useState<ProductVariant[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/product-variants?id=${productId}`)
      .then((r) => (r.ok ? r.json() : { variants: [] }))
      .then((data: { variants?: ProductVariant[] }) => {
        if (cancelled) return;
        const variantList = Array.isArray(data.variants) ? data.variants : [];
        if (variantList.length > 0) {
          setVariants(variantList);
        } else {
          // Fall back to /api/product-shades and convert to variant shape
          fetch(`/api/product-shades?id=${productId}`)
            .then((r) => (r.ok ? r.json() : { shades: [] }))
            .then((shadeData: { shades?: ShadeOption[] }) => {
              if (cancelled) return;
              const sorted = sortShadesLightFirst(Array.isArray(shadeData.shades) ? shadeData.shades : []);
              const converted: ProductVariant[] = sorted.map((s) => ({
                shade_name: s.name,
                shade_image_url: s.image_url || null,
                swatch_url: s.swatch_url || null,
                sort_order: 0
              }));
              setVariants(converted);
            })
            .catch(() => {
              if (!cancelled) setVariants([]);
            });
        }
      })
      .catch(() => {
        if (!cancelled) setVariants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (variants === null) {
    return (
      <div className="mt-6">
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</span>
        <div className="mt-2 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-9 w-9 animate-pulse rounded-full bg-ink/[0.07]" />
          ))}
        </div>
      </div>
    );
  }
  if (variants.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</span>
        <span className={`text-xs ${error ? "font-semibold text-red-500" : "text-ink/70"}`}>
          {selected ?? (error ? `Please select a ${label.toLowerCase()} to continue` : `${variants.length} available`)}
        </span>
        {selected ? (
          <button type="button" onClick={() => onSelect(null)} className="text-[10px] uppercase tracking-[0.14em] text-accent underline">
            Clear
          </button>
        ) : null}
      </div>
      <div className={`mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1 ${error ? "rounded-lg border border-red-300 p-2" : ""}`}>
        {variants.map((variant) => {
          const active = selected === variant.shade_name;
          const swatch = productImageSrc(variant.swatch_url);
          return (
            <button
              key={variant.shade_name}
              type="button"
              onClick={() => onSelect(active ? null : variant.shade_name, active ? null : (variant.shade_image_url ?? null))}
              title={variant.shade_name}
              className={
                "flex items-center gap-2 rounded-full border px-2 py-1 text-xs transition-colors " +
                (active ? "border-accent bg-accent/10 text-ink" : "border-ink/15 bg-white text-ink/80 hover:border-ink/40")
              }
            >
              {swatch ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={swatch} alt="" className="h-6 w-6 rounded-full object-cover" loading="lazy" />
              ) : null}
              <span className="max-w-[120px] truncate">{variant.shade_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductDetailClient({ product, promoGift }: Props) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  const gallery = product.images.length > 0 ? product.images : product.image_url ? [product.image_url] : [];
  const [activeImage, setActiveImage] = useState(0);
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const [variantImage, setVariantImage] = useState<string | null>(product.light_shade_image_url ?? null);
  const [variantImgFailed, setVariantImgFailed] = useState(false);

  const activeSrc = variantImage ? productImageSrc(variantImage) : productImageSrc(gallery[activeImage]);
  const showActive = variantImage
    ? Boolean(activeSrc) && !variantImgFailed
    : Boolean(activeSrc) && !imgFailed[activeImage];

  // Complexion products get the optional Shade Finder prompt; anything
  // shade/colour-relevant gets the shade picker.
  const isComplexion =
    (product.subcategory != null && COMPLEXION_SUBCATEGORIES.has(product.subcategory)) ||
    /foundation|concealer|tint|bb cream|cc cream|cushion|complexion/i.test(product.name);
  const shadeRelevant = isShadeRelevant(product.subcategory, product.name);
  const shadeLabel = isComplexion ? "Shade" : "Colour";
  const [selectedShade, setSelectedShade] = useState<string | null>(null);
  const [shadeError, setShadeError] = useState(false);

  function handleShadeSelect(name: string | null, imageUrl?: string | null) {
    setSelectedShade(name);
    if (name) {
      setShadeError(false);
      setVariantImgFailed(false);
      setVariantImage(imageUrl ?? null);
    } else {
      setVariantImage(product.light_shade_image_url ?? null);
    }
  }

  function addToCart(open: boolean) {
    if (shadeRelevant && !selectedShade) {
      setShadeError(true);
      document.getElementById("shade-picker-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const baseId = product.product_url || product.id || `${product.brand}|${product.name}`;
    addItem({
      // Distinct cart lines per shade, so two shades of one product don't merge.
      id: selectedShade ? `${baseId}#${selectedShade}` : baseId,
      brand: product.brand,
      name: selectedShade ? `${product.name} — ${shadeLabel}: ${selectedShade}` : product.name,
      price_usd: product.price_usd,
      price_gbp: product.price_gbp,
      image_url: product.image_url ?? "",
      product_url: product.product_url ?? "",
      category: product.category ?? "",
      quantity: qty
    });

    // Auto-add the promo EDP gift when buying the Summer's Hottest Look Set.
    if (promoGift) {
      const giftId = `${promoGift.product_url}#promo-gift`;
      const cartState = useCart.getState();
      if (!cartState.items.some((i) => i.id === giftId)) {
        cartState.addItem({
          id: giftId,
          brand: promoGift.brand,
          name: promoGift.name,
          price_usd: 0,
          price_gbp: 0,
          image_url: promoGift.image_url ?? "",
          product_url: promoGift.product_url ?? "",
          category: promoGift.category ?? "",
          quantity: 1,
          is_promo_gift: true
        });
      }
    }

    setShadeError(false);
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
              onError={() => {
                if (variantImage) setVariantImgFailed(true);
                else setImgFailed((p) => ({ ...p, [activeImage]: true }));
              }}
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
                  onClick={() => { setVariantImage(null); setActiveImage(i); }}
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

        {/* Promo gift banner — only shown on the Summer's Hottest Look Set page */}
        {promoGift ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-4">
            <span className="text-xl leading-none">🎁</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Complimentary Gift</p>
              <p className="mt-1 text-sm text-ink">
                Buy this Set and receive the <strong>Easy Bake Intense EDP</strong> free. 1 buyer gets the full-size bottle; the remaining 9 each get the Travel Spray 10ml (worth $42).
              </p>
              <p className="mt-1 text-[11px] text-ink/50">
                First 10 buyers only · Website orders only · Confirmed when your payment clears.
              </p>
              <p className="mt-1 text-[11px] text-ink/50">
                We&apos;ll contact you on WhatsApp to choose your shades.
              </p>
            </div>
          </div>
        ) : null}

        {shadeRelevant ? (
          <div id="shade-picker-section">
            <ShadePicker productId={product.id} label={shadeLabel} selected={selectedShade} onSelect={handleShadeSelect} error={shadeError} />
          </div>
        ) : null}

        {isComplexion ? (
          <Link
            href="/shade-finder"
            className="mt-6 flex items-center justify-center gap-2 rounded-md border border-gold/50 bg-gold/15 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold/25"
          >
            Need help choosing the right shade? Try our Shade Finder 🐝
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
