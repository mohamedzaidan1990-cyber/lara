"use client";

import Link from "next/link";
import { useState } from "react";
import { productImageSrc } from "@/lib/images";

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
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

// Clean branded fallback shown when an image is missing or fails to load:
// gold ground, dark serif brand initial — keeps the grid tidy and on-brand.
function ImageFallback({ brand, name }: { brand: string; name: string }) {
  const initial = (brand || name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center font-serif"
      style={{ backgroundColor: "#F4D360", color: "#23272A" }}
    >
      <span className="text-6xl leading-none">{initial}</span>
      <span className="mt-3 px-4 text-center text-[10px] uppercase tracking-[0.24em]">{brand || name}</span>
    </div>
  );
}

export default function ProductCard({ product }: Props) {
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
    <article className="group flex flex-col">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink/[0.03]">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={`${product.brand} ${product.name}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <ImageFallback brand={product.brand} name={product.name} />
        )}
        <span
          className={
            "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] " +
            (product.deliverable_lebanon
              ? "bg-cream/95 text-ink"
              : "bg-ink/85 text-cream")
          }
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (product.deliverable_lebanon ? "bg-gold" : "bg-cream/70")
            }
          />
          {product.deliverable_lebanon ? "Ships worldwide" : "Ask us"}
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[11px] uppercase tracking-[0.24em] text-ink/60">{product.brand}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ink">{product.name}</p>
        <p className="mt-3 font-serif text-lg text-ink">{formatUsd(product.price_usd)}</p>

        <div className="mt-4 flex items-center gap-3">
          <Link href={orderHref} className="btn-primary flex-1 text-center">
            Order now
          </Link>
        </div>
      </div>
    </article>
  );
}
