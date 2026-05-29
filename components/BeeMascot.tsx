"use client";

import { useId } from "react";

export type BeeVariant = "loading" | "success" | "floating" | "small";

const SIZES: Record<BeeVariant, number> = {
  loading: 96,
  success: 104,
  floating: 76,
  small: 24
};

const ANIM_CLASS: Record<BeeVariant, string> = {
  loading: "bee-anim-loading",
  success: "bee-anim-success",
  floating: "bee-anim-floating",
  small: ""
};

// Cute-but-elegant SVG bee: gold body, dark stripes, shimmering white wings,
// gold-tipped antennae. Wings flap continuously.
export function BeeSvg({ size = 64, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const clip = `beeBody-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clip}>
          <ellipse cx="32" cy="39" rx="16" ry="13" />
        </clipPath>
      </defs>

      {/* antennae */}
      <path d="M28 17 Q25 8 21 6" stroke="#23272A" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M36 17 Q39 8 43 6" stroke="#23272A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="21" cy="6" r="2.2" fill="#F4D360" />
      <circle cx="43" cy="6" r="2.2" fill="#F4D360" />

      {/* wings */}
      <g className="bee-wings">
        <ellipse cx="24" cy="23" rx="11" ry="7" fill="#FFFFFF" fillOpacity="0.72" stroke="#F4D360" strokeOpacity="0.55" />
        <ellipse cx="42" cy="23" rx="11" ry="7" fill="#FFFFFF" fillOpacity="0.72" stroke="#F4D360" strokeOpacity="0.55" />
      </g>

      {/* body */}
      <ellipse cx="32" cy="39" rx="16" ry="13" fill="#F4D360" />
      <g clipPath={`url(#${clip})`}>
        <rect x="33.5" y="25" width="5" height="28" rx="1" fill="#23272A" />
        <rect x="41.5" y="25" width="4.5" height="28" rx="1" fill="#23272A" />
        <rect x="25.5" y="25" width="4.5" height="28" rx="1" fill="#23272A" fillOpacity="0.85" />
      </g>

      {/* eyes */}
      <circle cx="27" cy="36" r="1.9" fill="#23272A" />
      <circle cx="36" cy="36" r="1.9" fill="#23272A" />
    </svg>
  );
}

interface Props {
  variant?: BeeVariant;
  label?: string;
  className?: string;
}

export function BeeMascot({ variant = "floating", label, className = "" }: Props) {
  const size = SIZES[variant];
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <span className={ANIM_CLASS[variant]} style={{ display: "inline-block" }}>
        <BeeSvg size={size} />
      </span>
      {label ? <p className="text-sm uppercase tracking-[0.2em] text-ink/70">{label}</p> : null}
    </div>
  );
}

export default BeeMascot;
