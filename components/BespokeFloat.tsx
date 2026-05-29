"use client";

import { useState } from "react";
import { BeeSvg } from "./BeeMascot";
import { whatsappRequestLink } from "@/lib/links";

export default function BespokeFloat() {
  const [open, setOpen] = useState(false);
  const wa = whatsappRequestLink("Hi Seasons by B, I'd like to request: ");

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="w-72 border border-ink/10 bg-cream p-5 shadow-soft">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <BeeSvg size={22} />
              <p className="font-serif text-lg text-ink">Personal Sourcing</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="text-ink/40 transition-colors hover:text-accent"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Looking for something specific? Bags, rare finds, limited editions — we source anything from
            London&apos;s finest boutiques.
          </p>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="btn-gold mt-4 w-full"
            onClick={() => setOpen(false)}
          >
            Start Your Request →
          </a>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Bespoke request"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          "group flex h-[60px] items-center gap-0 overflow-hidden rounded-full border border-gold-600/30 pl-[14px] pr-[14px] text-ink shadow-soft transition-all duration-300 sm:hover:pr-6 " +
          (open ? "" : "bespoke-pulse")
        }
        style={{ backgroundColor: "#F4D360" }}
      >
        <BeeSvg size={32} />
        <span className="hidden max-w-0 whitespace-nowrap text-xs uppercase tracking-[0.18em] opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-[160px] group-hover:opacity-100 sm:inline">
          Bespoke Request
        </span>
      </button>
    </div>
  );
}
