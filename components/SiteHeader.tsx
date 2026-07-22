"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { INSTAGRAM_URL } from "@/lib/links";
import SearchAutocomplete from "@/components/SearchAutocomplete";

function CartButton({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const openCart = useCart((s) => s.openCart);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      data-cart-target
      onClick={openCart}
      aria-label={`Open cart${mounted && count > 0 ? `, ${count} items` : ""}`}
      className={"relative inline-flex h-9 w-9 items-center justify-center text-ink transition-transform hover:scale-110 hover:text-accent " + className}
    >
      <ShoppingBag className="h-5 w-5" />
      {mounted && count > 0 ? (
        <span
          key={count}
          className="cart-badge-pop absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: "#e040a0" }}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const [shopOpen, setShopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const shopRef = useRef<HTMLDivElement | null>(null);

  // Hide the header scrolling down, bring it back scrolling up. Small deltas
  // are ignored so it doesn't flicker on touch momentum wobble.
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 80) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
  }

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
    <header
      className={
        "sticky top-0 z-40 px-3 pt-3 transition-transform duration-300 ease-out sm:px-6 sm:pt-4 " +
        (hidden && !mobileOpen ? "-translate-y-[130%]" : "translate-y-0")
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full glass-pill px-5 py-3 shadow-soft sm:px-8">
        <div className="flex items-center gap-1.5">
          <Link href="/" className="flex items-center leading-none" onClick={() => setMobileOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Seasons by B"
              className="h-9 w-auto sm:h-11"
              width={460}
              height={188}
            />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.16em] text-ink/70 sm:flex">
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
                className="absolute left-0 top-full mt-4 w-64 overflow-hidden rounded-2xl border border-accent/10 bg-white/90 shadow-soft backdrop-blur-xl"
              >
                <ul className="py-2">
                  {CATEGORY_DEFS.map((cat) => (
                    <li key={cat.slug} role="none">
                      <Link
                        href={`/category/${cat.slug}`}
                        role="menuitem"
                        onClick={() => setShopOpen(false)}
                        className="block px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-accent/10 hover:text-accent"
                      >
                        {cat.label}
                      </Link>
                    </li>
                  ))}
                  <li role="none">
                    <div className="mx-4 my-1 border-t border-ink/10" />
                  </li>
                  <li role="none">
                    <Link
                      href="/brands"
                      role="menuitem"
                      onClick={() => setShopOpen(false)}
                      className="block px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/10"
                    >
                      All Brands A–Z →
                    </Link>
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
          <Link href="/k-beauty" className="nav-underline hover:text-accent" style={{ color: "#e84393" }}>
            K-Beauty 🌸
          </Link>
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
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="nav-underline text-accent hover:opacity-80"
          >
            Instagram
          </a>
          <div className="w-32 shrink-0 md:w-44 lg:w-56">
            <SearchAutocomplete query={searchQuery} setQuery={setSearchQuery} onSubmit={submitSearch} size="compact" />
          </div>
          <CartButton />
        </nav>

        {/* Mobile: cart + menu toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <CartButton />
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/20 text-accent"
          >
            <span className="sr-only">Menu</span>
            {mobileOpen ? "✕" : "≡"}
          </button>
        </div>
      </div>

      {!mobileOpen ? (
        <div className="mx-3 mt-2 sm:hidden">
          <SearchAutocomplete query={searchQuery} setQuery={setSearchQuery} onSubmit={submitSearch} size="compact" />
        </div>
      ) : null}

      {mobileOpen ? (
        <div className="mx-3 mt-3 rounded-3xl glass-pill p-4 shadow-soft sm:hidden">
          <div className="mx-auto max-w-7xl">
            <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-ink/50">Shop</p>
            <ul className="grid grid-cols-2 gap-1">
              {CATEGORY_DEFS.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-accent/10 pt-3">
              <Link
                href="/brand/huda-beauty"
                onClick={() => setMobileOpen(false)}
                className="block rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-accent hover:opacity-80"
              >
                Huda Beauty x Seasons by B
              </Link>
              <Link
                href="/brands"
                onClick={() => setMobileOpen(false)}
                className="block rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-accent hover:opacity-80"
              >
                All Brands A–Z →
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-accent/10 pt-3 text-xs font-bold uppercase tracking-[0.16em]">
              <Link
                href="/k-beauty"
                onClick={() => setMobileOpen(false)}
                className="hover:text-accent"
                style={{ color: "#e84393" }}
              >
                K-Beauty 🌸
              </Link>
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
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:opacity-80"
              >
                Instagram
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
