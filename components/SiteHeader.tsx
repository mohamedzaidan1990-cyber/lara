"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_DEFS } from "@/lib/categories";

export default function SiteHeader() {
  const [shopOpen, setShopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement | null>(null);

  // Close the shop dropdown on outside click / Escape.
  useEffect(() => {
    if (!shopOpen) return;
    function onClick(e: MouseEvent) {
      if (!shopRef.current) return;
      if (!shopRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShopOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [shopOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col leading-none" onClick={() => setMobileOpen(false)}>
          <span className="font-serif text-3xl text-ink">Seasons by B</span>
          <span className="mt-1 hidden text-[10px] uppercase tracking-[0.32em] text-ink/60 sm:block">
            London&apos;s finest, delivered to your door
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.18em] text-ink/70 sm:flex">
          <div className="relative" ref={shopRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={shopOpen}
              onClick={() => setShopOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 hover:text-accent"
            >
              Shop
              <Chevron open={shopOpen} />
            </button>
            {shopOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-3 w-64 border border-ink/10 bg-cream shadow-soft"
              >
                <ul className="py-2">
                  {CATEGORY_DEFS.map((cat) => (
                    <li key={cat.slug} role="none">
                      <Link
                        href={`/category/${cat.slug}`}
                        role="menuitem"
                        onClick={() => setShopOpen(false)}
                        className="block px-5 py-3 text-xs uppercase tracking-[0.18em] text-ink hover:bg-gold/20 hover:text-accent"
                      >
                        {cat.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <Link href="/shade-finder" className="nav-underline hover:text-accent">
            Shade Finder ✨
          </Link>
          <Link href="/info" className="nav-underline hover:text-accent">
            How it works
          </Link>
          <Link href="/bespoke" className="nav-underline hover:text-accent">
            Bespoke
          </Link>
          <a
            href="https://wa.me/96103055491"
            target="_blank"
            rel="noreferrer"
            className="nav-underline text-accent hover:opacity-80"
          >
            WhatsApp
          </a>
        </nav>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center border border-ink/15 text-ink sm:hidden"
        >
          <span className="sr-only">Menu</span>
          {mobileOpen ? "✕" : "≡"}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-ink/10 bg-cream sm:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <p className="px-1 pb-2 text-[10px] uppercase tracking-[0.24em] text-ink/60">Shop</p>
            <ul className="grid grid-cols-2 gap-1">
              {CATEGORY_DEFS.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 text-xs uppercase tracking-[0.18em] text-ink hover:bg-gold/20 hover:text-accent"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-3 text-xs uppercase tracking-[0.18em]">
              <Link
                href="/shade-finder"
                onClick={() => setMobileOpen(false)}
                className="text-ink hover:text-accent"
              >
                Shade Finder ✨
              </Link>
              <Link
                href="/info"
                onClick={() => setMobileOpen(false)}
                className="text-ink hover:text-accent"
              >
                How it works
              </Link>
              <Link
                href="/bespoke"
                onClick={() => setMobileOpen(false)}
                className="text-ink hover:text-accent"
              >
                Bespoke
              </Link>
              <a
                href="https://wa.me/96103055491"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:opacity-80"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
