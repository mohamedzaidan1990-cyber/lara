import type { CSSProperties, ReactNode } from "react";
import { Fraunces } from "next/font/google";
import { HOLIDAY_SUBTITLE, HOLIDAY_TITLE } from "@/lib/holiday-collection";

// Poster face only — the rest of the site stays on DM Sans.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap"
});

// Cut top corners, like a die-cut gift tag, plus a real punched hole so the
// poster shows through it.
const TAG_CLIP = "polygon(17% 0, 83% 0, 100% 13%, 100% 100%, 0 100%, 0 13%)";
const TAG_HOLE_MASK = "radial-gradient(circle at 50% 1.6rem, transparent 0.42rem, #000 0.46rem)";

interface Props {
  // "banner" is the wide homepage section header; "popup" is the stacked card.
  variant: "banner" | "popup";
  // Optional line under the subtitle (delivery info, status, etc.).
  note?: string;
  // Optional call-to-action, rendered under the copy.
  cta?: ReactNode;
  // id for the heading, so a wrapping <section> can label itself with it.
  headingId?: string;
}

export default function HolidayPoster({ variant, note, cta, headingId }: Props) {
  const isPopup = variant === "popup";
  const Heading = isPopup ? "p" : "h2";

  return (
    <div
      className={
        "relative isolate overflow-hidden text-cream " +
        (isPopup ? "rounded-[2rem] px-7 pb-8 pt-9" : "rounded-[2rem] px-6 py-10 sm:px-10 lg:px-14 lg:py-12")
      }
      style={{
        background:
          "radial-gradient(120% 90% at 12% 0%, #7d1236 0%, #4a0f2c 46%, #2a0a1c 100%)"
      }}
    >
      {/* Snow: two sparse dot layers at different pitch so it doesn't read as a grid. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1.6px), radial-gradient(circle, rgba(255,214,238,0.4) 1.4px, transparent 2px)",
          backgroundSize: "83px 83px, 131px 131px",
          backgroundPosition: "0 0, 41px 57px"
        }}
      />

      <Ribbon isPopup={isPopup} />

      {/* On the banner this one sits under the ribbon at phone width, so it only shows from sm up. */}
      <Sparkle
        className={"holiday-twinkle absolute text-[#e9c46a] " + (isPopup ? "" : "hidden sm:block")}
        style={sparkA(isPopup)}
      />
      <Sparkle
        className="holiday-twinkle absolute text-[#ffd6ee]"
        style={{ ...sparkB(isPopup), animationDelay: "1.1s" }}
      />

      <div
        className={
          isPopup
            ? "flex flex-col items-center text-center"
            : "flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:gap-14"
        }
      >
        <GiftTag isPopup={isPopup} />

        <div className={isPopup ? "mt-7" : "max-w-xl"}>
          <Heading
            id={headingId}
            className={
              display.className +
              " font-semibold leading-[1.02] tracking-tight " +
              (isPopup ? "text-4xl" : "text-4xl sm:text-5xl lg:text-6xl")
            }
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            {HOLIDAY_TITLE}
          </Heading>
          <p className={"mt-3 text-sm leading-relaxed text-cream/80 sm:text-base " + (isPopup ? "mx-auto max-w-[17rem]" : "")}>
            {HOLIDAY_SUBTITLE}
          </p>
          {note ? <p className="mt-3 text-sm text-[#e9c46a]">{note}</p> : null}
          {cta ? <div className="mt-6">{cta}</div> : null}
        </div>
      </div>
    </div>
  );
}

// Brand-pink ribbon wrapped across the top-right corner, with gold stitching.
function Ribbon({ isPopup }: { isPopup: boolean }) {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute rotate-45 " +
        (isPopup ? "-right-[4.5rem] top-[2rem] h-9 w-[16rem]" : "-right-20 top-[3rem] h-12 w-[22rem]")
      }
      style={{
        background: "linear-gradient(90deg, #c62f88 0%, #e040a0 50%, #c62f88 100%)",
        boxShadow: "0 6px 14px -4px rgba(0,0,0,0.5)"
      }}
    >
      <div className="absolute inset-x-0 inset-y-[5px] border-y border-dashed border-[#e9c46a]/80" />
      {!isPopup ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-[0.14em] text-white">
          Gifts &amp; sets
        </span>
      ) : null}
    </div>
  );
}

function GiftTag({ isPopup }: { isPopup: boolean }) {
  return (
    <div
      aria-hidden
      className={"relative shrink-0 " + (isPopup ? "w-40" : "w-40 sm:w-48 lg:w-56")}
      style={{
        transform: "rotate(-6deg)",
        transformOrigin: "50% 0",
        filter: "drop-shadow(0 18px 20px rgba(0,0,0,0.45))"
      }}
    >
      {/* Twine looping up through the hole. */}
      <svg
        viewBox="0 0 60 70"
        className="absolute left-1/2 z-10 h-[4.4rem] w-14 -translate-x-1/2 overflow-visible"
        style={{ bottom: "calc(100% - 1.6rem)" }}
        fill="none"
        stroke="#e9c46a"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M30 70 C30 44 8 40 12 12" />
        <path d="M30 70 C30 46 52 38 48 6" />
        <circle cx="30" cy="70" r="3.4" />
      </svg>

      <div
        className="bg-cream px-5 pb-7 pt-14 text-ink"
        style={{ clipPath: TAG_CLIP, WebkitMaskImage: TAG_HOLE_MASK, maskImage: TAG_HOLE_MASK }}
      >
        <p className={display.className + " text-[13px] italic text-ink/55"}>To:</p>
        <p className={display.className + " text-2xl font-semibold italic leading-tight"}>someone special</p>
        <div className="my-4 border-t border-dashed border-[#c9a24b]" />
        <p className={display.className + " text-[13px] italic text-ink/55"}>From:</p>
        <p className={display.className + " text-xl font-semibold italic leading-tight text-accent-600"}>you</p>
      </div>
    </div>
  );
}

function Sparkle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={style} fill="currentColor">
      <path d="M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z" />
    </svg>
  );
}

function sparkA(isPopup: boolean): CSSProperties {
  return isPopup
    ? { left: "1.4rem", top: "4.4rem", width: "1.1rem", height: "1.1rem" }
    : { right: "38%", top: "1.6rem", width: "1.3rem", height: "1.3rem" };
}

function sparkB(isPopup: boolean): CSSProperties {
  return isPopup
    ? { right: "1.6rem", bottom: "5.5rem", width: "0.85rem", height: "0.85rem" }
    : { right: "9%", bottom: "2rem", width: "1rem", height: "1rem" };
}
