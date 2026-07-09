"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const EDP_FULL_IMAGE = "https://cdn.shopify.com/s/files/1/0959/8962/9206/files/EASY-BAKE-INTENSE-FRAGRANCE-50ML-ECOMM_01_121657ff-8251-4471-80ca-dba4ba57c4bb.webp?v=1778054948";
const EDP_MINI_IMAGE = "https://hudabeauty.com/cdn/shop/files/EASY-BAKE-INTENSE-FRAGRANCE-10ML-ECOMM_01.webp?v=1777881528";

const NEON: React.CSSProperties = {
  color: "#e040a0",
  textShadow: "0 0 12px rgba(224,64,160,0.9), 0 0 28px rgba(224,64,160,0.5)"
};
const NEON_SOFT: React.CSSProperties = {
  color: "#f4c6e2",
  textShadow: "0 0 6px rgba(224,64,160,0.3)"
};
const NEON_DIM: React.CSSProperties = {
  color: "#c9a0bc",
};

const KIT_PRODUCTS = [
  {
    label: "Blush Filter Blurring\nBlushlighters Palette",
    shade: true,
    image: "https://cdn.shopify.com/s/files/1/0959/8962/9206/files/BLUSH-FILTER-PALETTE_PDP_PACKSHOTS_FINAL_BABYPINK.jpg?v=1763882814",
  },
  {
    label: "Blush Filter\nLiquid Blush",
    shade: true,
    image: "https://hudabeauty.com/cdn/shop/files/BLUSH-FILTER-REFRESH_PDP_PACKSHOTS_FINAL_6-STRAWBERRY-LATTE.webp?v=1774424494",
  },
  {
    label: "FAUX FILLER Extra\nShine Lip Gloss",
    shade: true,
    image: "https://hudabeauty.com/cdn/shop/files/STRAWBERRY-LATTE_FFGLOSS_PDP_PACKSHOTS_LIGHTCEALER_1.webp?v=1774885552",
  },
  {
    label: "Huda Beauty\nBrush",
    shade: false,
    image: "https://cdn.shopify.com/s/files/1/0959/8962/9206/files/PDP-SECTION1-DIFFUSINGCHEEKBRUSH-TILE1.webp?v=1763639394",
  },
  {
    label: "Full-size Huda\nBeauty Concealer",
    shade: true,
    image: "https://cdn.shopify.com/s/files/1/0959/8962/9206/files/PDP-SECTION1-FFCONCEALER-GRAHAMCRACKER-TILE1_dbf38229-faea-48e6-bf08-76fb7fd7c070.webp?v=1759671989",
  },
];

export default function PromoSection() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/promo-count")
      .then((r) => r.json())
      .then((d: { remaining: number }) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  const kitHref = "/product/2537a076-a935-424d-9fc2-dfdef906ac47";
  const spotsLeft = remaining ?? 10;
  const spotsTaken = 10 - spotsLeft;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: 600 }}
    >
      {/* background image */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/easy-bake-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* dark overlay for text readability */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "rgba(10,2,12,0.62)" }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-14">
        {/* header label */}
        <p
          className="text-center text-[9px] font-bold uppercase tracking-[0.45em]"
          style={NEON}
        >
          Exclusive Kit · Limited to 10 Buyers
        </p>

        {/* title */}
        <h2
          className="mt-3 text-center font-serif text-3xl sm:text-4xl"
          style={{ color: "#fff", textShadow: "0 2px 24px rgba(224,64,160,0.25)" }}
        >
          Huda Beauty × Seasons by B Kit
        </h2>

        {/* product image row */}
        <div className="mt-8 flex items-end justify-center gap-3 sm:gap-5">
          {KIT_PRODUCTS.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-1.5" style={{ width: 56 }}>
              <div
                className="overflow-hidden rounded-xl border-2"
                style={{
                  width: 56,
                  height: 56,
                  borderColor: "rgba(224,64,160,0.45)",
                  background: "#1a0020",
                  boxShadow: "0 0 10px rgba(224,64,160,0.25)",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.label.replace(/\n/, " ")}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <p
                className="text-center leading-tight"
                style={{ fontSize: 9, color: "#e8c8de", whiteSpace: "pre-line" }}
              >
                {p.label}
              </p>
              {p.shade && (
                <p style={{ fontSize: 8, ...NEON_DIM }} className="text-center">
                  shade of your choice
                </p>
              )}
            </div>
          ))}
        </div>

        {/* divider */}
        <div
          className="mx-auto mt-8 mb-6"
          style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(224,64,160,0.35), transparent)" }}
        />

        {/* prize box */}
        <div
          className="rounded-2xl border px-5 py-4"
          style={{
            borderColor: "rgba(224,64,160,0.3)",
            background: "rgba(224,64,160,0.07)",
          }}
        >
          <p
            className="text-center text-[9px] font-bold uppercase tracking-[0.3em]"
            style={NEON}
          >
            Every buyer wins a prize 🎁
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 sm:gap-10">
            {/* winner 1 */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="overflow-hidden rounded-full border-2"
                style={{ width: 64, height: 64, borderColor: "rgba(224,64,160,0.6)", boxShadow: "0 0 14px rgba(224,64,160,0.4)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={EDP_FULL_IMAGE} alt="Full-size EDP" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-center" style={NEON}>1 winner</p>
              <p className="text-xs font-semibold text-center" style={NEON_SOFT}>
                Full-size<br />Easy Bake Intense EDP
              </p>
            </div>

            {/* divider */}
            <div style={{ color: "rgba(224,64,160,0.4)", fontSize: 28, fontWeight: 100 }}>+</div>

            {/* winners 9 */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="overflow-hidden rounded-full border-2"
                style={{ width: 64, height: 64, borderColor: "rgba(224,64,160,0.35)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={EDP_MINI_IMAGE} alt="EDP Travel Spray" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-center" style={NEON}>9 winners</p>
              <p className="text-xs font-semibold text-center" style={NEON_SOFT}>
                EDP Travel<br />Spray 10ml
              </p>
            </div>
          </div>
        </div>

        {/* spot counter */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: i < spotsTaken ? "rgba(224,64,160,0.2)" : "#e040a0",
                  boxShadow: i < spotsTaken ? "none" : "0 0 7px rgba(224,64,160,0.9)",
                  border: i < spotsTaken ? "1px solid rgba(224,64,160,0.25)" : "none",
                }}
              />
            ))}
          </div>
          <p className="text-[11px]" style={NEON_DIM}>
            {spotsLeft === 10
              ? "All 10 spots available"
              : spotsLeft === 0
              ? "Fully booked — join the waitlist"
              : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} remaining`}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <Link
            href={kitHref}
            className="inline-block rounded-full px-10 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: "#e040a0",
              boxShadow: "0 4px 24px rgba(224,64,160,0.6)",
            }}
          >
            Get the Kit — $200
          </Link>
          <p className="text-[10px]" style={NEON_DIM}>
            Shade selection via WhatsApp after order · Website orders only
          </p>
        </div>
      </div>
    </div>
  );
}
