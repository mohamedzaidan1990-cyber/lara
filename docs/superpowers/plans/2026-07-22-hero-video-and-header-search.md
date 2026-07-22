# Full-Bleed Hero Video & Header Search Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the homepage hero video to a full-bleed silent looping background with the headline overlaid on top, and make the header's search always-visible (desktop + mobile) with live brand/product suggestions.

**Architecture:** Two independent, sequential tasks. Task 1 touches `components/AutoVideo.tsx` (add an opt-out for the sound toggle) and rewrites `components/HeroSection.tsx` (split layout → full-bleed). Task 2 touches `components/SearchAutocomplete.tsx` (add a `compact` size variant) and rewrites the search portions of `components/SiteHeader.tsx` (toggle-to-reveal panel → always-visible compact `SearchAutocomplete`).

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS 3, framer-motion, lucide-react icons.

## Global Constraints

- No automated test framework exists in this project (no jest/vitest/testing-library config, no `*.test.*` files). Verification for every step is manual: run `npm run dev` and check behavior in the browser at both mobile (`<640px`) and desktop (`≥1024px`) widths, per the project's UI-change convention.
- Spec source: `docs/superpowers/specs/2026-07-22-hero-video-and-header-search-design.md`.
- Do not change the Bespoke-section video (`HeroVideo` in `app/HomeClient.tsx`) — it must keep its sound toggle and current behavior unchanged.
- Do not change the homepage's existing "Search the edit" `SearchAutocomplete` block or `/search` page — both must keep their current (`default` size) appearance unchanged.

---

### Task 1: Full-bleed hero video

**Files:**
- Modify: `components/AutoVideo.tsx`
- Modify: `components/HeroSection.tsx`

**Interfaces:**
- Consumes: nothing new — uses existing `AutoVideo` component and `whatsappRequestLink()` from `@/lib/links`.
- Produces: `AutoVideo` gets a new optional prop `showSoundToggle?: boolean` (default `true`). When `false`, no mute/unmute button is rendered. `HeroSection` is now a single full-bleed section (no column split) — its exported signature (`HeroSection({ orderCount }: { orderCount?: number })`) is unchanged, so nothing else that imports it needs to change.

- [ ] **Step 1: Add `showSoundToggle` prop to `AutoVideo.tsx`**

In `components/AutoVideo.tsx`, add the prop to the `Props` interface (after `label`):

```tsx
interface Props {
  src: string;
  /** Positioning wrapper classes (e.g. "absolute inset-0"). */
  wrapperClassName?: string;
  /** Classes for the <video> itself (sizing / object-fit). */
  videoClassName?: string;
  poster?: string;
  /** Turn the sound on automatically at the first user interaction. */
  soundOnInteract?: boolean;
  /** Which corner the sound toggle sits in. */
  buttonSide?: "left" | "right";
  /** Loop the film. When false it plays through once and stops. */
  loop?: boolean;
  label?: string;
  /** Render the mute/unmute button. Set false for pure background videos. */
  showSoundToggle?: boolean;
}
```

Add `showSoundToggle = true` to the destructured function parameters:

```tsx
export default function AutoVideo({
  src,
  wrapperClassName = "",
  videoClassName = "",
  poster,
  soundOnInteract = false,
  buttonSide = "right",
  loop = true,
  label = "Brand film",
  showSoundToggle = true
}: Props) {
```

Wrap the returned `<button>` in a conditional (replace the existing return block):

```tsx
  return (
    <div className={"relative " + wrapperClassName}>
      <video
        ref={ref}
        className={videoClassName}
        src={src}
        poster={poster}
        autoPlay
        loop={loop}
        muted
        playsInline
        preload="auto"
        aria-label={label}
      />
      {showSoundToggle ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={muted ? "Turn sound on" : "Mute"}
          className={
            "absolute bottom-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/35 text-white shadow-md backdrop-blur-sm transition hover:bg-ink/70 " +
            (buttonSide === "left" ? "left-2.5" : "right-2.5")
          }
        >
          {muted ? <MutedIcon /> : <SoundIcon />}
        </button>
      ) : null}
    </div>
  );
```

- [ ] **Step 2: Verify the Bespoke-section video is unaffected**

Run: `npm run dev`, open `http://localhost:3000`, scroll to the Bespoke/request section near the bottom of the homepage.
Expected: the small rounded video card there still shows its mute/unmute button in the bottom-right corner exactly as before (it doesn't pass `showSoundToggle`, so it defaults to `true`).

- [ ] **Step 3: Rewrite `components/HeroSection.tsx` as a full-bleed background**

Replace the entire file content with:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AutoVideo from "@/components/AutoVideo";
import { whatsappRequestLink } from "@/lib/links";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

export default function HeroSection({ orderCount = 0 }: { orderCount?: number }) {
  const bespoke = whatsappRequestLink();

  return (
    <section className="relative flex min-h-[92vh] w-full items-end overflow-hidden bg-ink sm:items-center">
      <AutoVideo
        src="/hero-top.mp4"
        poster="/hero-top-poster.jpg"
        wrapperClassName="absolute inset-0 hero-kenburns"
        videoClassName="h-full w-full object-cover"
        showSoundToggle={false}
        label="Seasons by B brand film"
      />
      {/* scrim so the headline stays legible over the footage */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-ink/10" />

      <div className="relative z-10 w-full px-6 pt-24 pb-12 sm:px-10 lg:px-16 lg:pb-20">
        <motion.div
          className="max-w-md"
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.2, delayChildren: 0.1 }}
        >
          <motion.div variants={fade} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              <span aria-hidden>🐝</span> London → Lebanon in 14 days
            </span>
          </motion.div>
          <h1 className="mt-5 font-serif text-[48px] font-bold leading-[1.05] text-white sm:text-[56px]">
            {[
              { t: "London's" },
              { t: "Finest," },
              { t: "Sweetly", accent: true },
              { t: "Delivered", accent: true },
              { t: "To" },
              { t: "You" }
            ].map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                className={"mr-[0.26em] inline-block " + (w.accent ? "text-accent" : "")}
              >
                {w.t}
              </motion.span>
            ))}
          </h1>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 h-1.5 w-24 rounded-full"
            style={{ backgroundColor: "#e040a0" }}
          />
          <motion.p
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-6 text-base leading-relaxed text-white/80"
          >
            Luxury beauty, skincare and personal sourcing — curated in London, delivered to your door with a pop of joy in 10–14 days.
          </motion.p>
          <motion.div
            variants={fade}
            transition={{ duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="#shop-categories" className="btn-primary">
              Shop Now
            </Link>
            <a href={bespoke} target="_blank" rel="noreferrer" className="btn-outline">
              Request Bespoke
            </a>
          </motion.div>
          {orderCount > 0 ? (
            <motion.p
              variants={fade}
              transition={{ duration: 0.6 }}
              className="mt-6 inline-flex items-center gap-2 text-sm text-white/80"
            >
              <span aria-hidden className="inline-flex h-2 w-2 rounded-full bg-accent" />
              <strong className="text-white">{orderCount}+ orders</strong> delivered to Lebanon — and counting
            </motion.p>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
```

Note: `.btn-outline` (defined in `app/globals.css`) already renders an opaque `bg-white/70` pill with accent border/text, so it stays legible over the video without a new class.

- [ ] **Step 4: Verify the new hero in the browser**

Run: `npm run dev`, open `http://localhost:3000` at a mobile width (~375px) and a desktop width (~1440px).
Expected at both widths: the video fills the entire hero section edge-to-edge, loops continuously with no visible mute/unmute button, the headline/tagline/buttons sit on top of it and are clearly legible, "Shop Now" scrolls to `#shop-categories`, "Request Bespoke" opens the WhatsApp link.

- [ ] **Step 5: Commit**

```bash
git add components/AutoVideo.tsx components/HeroSection.tsx
git commit -m "$(cat <<'EOF'
Make homepage hero video a full-bleed silent background

Replaces the split video/text layout with a full-bleed looping
background video and headline overlay, per user request to make the
hero video "stay in the background only". AutoVideo gains a
showSoundToggle opt-out used only here; the Bespoke-section video
keeps its toggle.
EOF
)"
```

---

### Task 2: Always-visible header search with suggestions

**Files:**
- Modify: `components/SearchAutocomplete.tsx`
- Modify: `components/SiteHeader.tsx`

**Interfaces:**
- Consumes: `SearchAutocomplete`'s existing props `query: string`, `setQuery: (v: string) => void`, `onSubmit: (e: React.FormEvent) => void` (unchanged) plus the new `size?: "default" | "compact"` (default `"default"`).
- Produces: `SiteHeader` renders `SearchAutocomplete` with `size="compact"` in two places (desktop nav row, new mobile row), both driven by the same `searchQuery`/`setSearchQuery` state and `submitSearch` handler already defined in `SiteHeader`.

- [ ] **Step 1: Add a `compact` size to `SearchAutocomplete.tsx`**

In `components/SearchAutocomplete.tsx`, add the lucide `Search` icon import at the top (alongside the existing `BeeSvg` import):

```tsx
import { Search } from "lucide-react";
```

Update the `Props` interface:

```tsx
interface Props {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  size?: "default" | "compact";
}
```

Update the function signature to destructure `size`:

```tsx
export default function SearchAutocomplete({ query, setQuery, onSubmit, size = "default" }: Props) {
```

Right after the existing `const hasDropdown = open && rows.length > 0;` line, add:

```tsx
  const compact = size === "compact";
```

Replace the returned JSX's outer wrapper and `<form>` block (the part before `{hasDropdown ? (`) with:

```tsx
  return (
    <div ref={containerRef} className={compact ? "relative w-full" : "relative mx-auto max-w-2xl"}>
      <form
        onSubmit={(e) => {
          setOpen(false);
          onSubmit(e);
        }}
        className={compact ? "flex items-stretch gap-0" : "flex items-stretch gap-0 shadow-soft"}
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={compact ? "Search…" : "Search across every category — e.g. Charlotte Tilbury"}
          className={
            compact
              ? "w-full min-w-0 rounded-l-full border border-ink/15 bg-white/90 px-4 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
              : "flex-1 border border-ink/15 bg-white px-5 py-4 text-base text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
          }
          role="combobox"
          aria-expanded={hasDropdown}
          aria-autocomplete="list"
        />
        {compact ? (
          <button
            type="submit"
            aria-label="Search"
            className="inline-flex shrink-0 items-center justify-center rounded-r-full border border-l-0 border-ink/15 bg-accent px-3 text-white transition-transform hover:scale-[1.05]"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" className="btn-primary px-8 transition-transform hover:scale-[1.02]">
            Search
          </button>
        )}
      </form>
```

Update the dropdown `<ul>` container's className (the line right after `{hasDropdown ? (`) to size its corners/shadow appropriately:

```tsx
        <ul
          className={
            compact
              ? "absolute left-0 right-0 z-30 mt-1 max-h-[360px] overflow-auto rounded-2xl border border-ink/15 bg-white text-left shadow-soft"
              : "absolute left-0 right-0 z-30 mt-1 max-h-[420px] overflow-auto border border-ink/15 bg-white text-left shadow-soft"
          }
        >
```

Everything below that (the brand rows, product rows, and the closing "Search for..." row) stays exactly as-is — no other changes in this file.

- [ ] **Step 2: Verify the homepage's existing search block is unchanged**

Run: `npm run dev`, open `http://localhost:3000`, scroll to the "Search the edit" section.
Expected: looks and behaves exactly as before (it doesn't pass `size`, so it defaults to `"default"`).

- [ ] **Step 3: Replace the header's toggle-to-reveal search in `components/SiteHeader.tsx`**

Add the import at the top of the file (alongside the existing `SiteHeader` imports):

```tsx
import SearchAutocomplete from "@/components/SearchAutocomplete";
```

Remove these now-unused pieces from the component body:
- The `searchOpen` state: `const [searchOpen, setSearchOpen] = useState(false);`
- The `searchInputRef` ref: `const searchInputRef = useRef<HTMLInputElement | null>(null);`
- The `openSearch()` function (the `setSearchOpen(true)` / focus-timeout one).
- `Search` from the `lucide-react` import line (change `import { ShoppingBag, Search } from "lucide-react";` to `import { ShoppingBag } from "lucide-react";`) — it's no longer used anywhere in this file once the steps below are applied.

Update the header's hide-on-scroll className condition, which currently reads `(hidden && !mobileOpen && !searchOpen ? ... )`, to drop `!searchOpen` (that state no longer exists):

```tsx
        (hidden && !mobileOpen ? "-translate-y-[130%]" : "translate-y-0")
```

Remove the mobile-only search icon button from the logo row (the `<button aria-label="Search" onClick={openSearch} ... sm:hidden>` right after the logo `<Link>`), leaving just:

```tsx
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
```

In the desktop `<nav>`, replace the search icon `<button>` right before `<CartButton />` with the compact search:

```tsx
          <div className="w-32 shrink-0 md:w-44 lg:w-56">
            <SearchAutocomplete query={searchQuery} setQuery={setSearchQuery} onSubmit={submitSearch} size="compact" />
          </div>
          <CartButton />
```

Remove the whole `{searchOpen ? ( ... ) : null}` panel block (the one with the `Cancel` button) that currently sits between the closing `</div>` of the header's main row and the `{mobileOpen ? ( ... }` block. Replace it with a permanently-rendered mobile search row, shown whenever the mobile menu isn't open:

```tsx
      {!mobileOpen ? (
        <div className="mx-3 mt-2 sm:hidden">
          <SearchAutocomplete query={searchQuery} setQuery={setSearchQuery} onSubmit={submitSearch} size="compact" />
        </div>
      ) : null}
```

Finally, remove the now-redundant search entry inside the mobile menu panel (the `<button type="button" onClick={openSearch} ...><Search .../> Search</button>` block near the top of the `mobileOpen` panel's content, right after the category grid and before the `Huda Beauty x Seasons by B` link) — delete that whole `<button>` element; the `<div className="mt-3 border-t border-accent/10 pt-3">` wrapper around it stays (it still contains the Huda Beauty and "All Brands A–Z" links).

- [ ] **Step 4: Verify the header search end-to-end**

Run: `npm run dev`, open `http://localhost:3000`.
At desktop width (~1440px): confirm a search input (no click needed) sits inline in the header nav, before the cart icon. Type a brand name that exists in the catalogue (e.g. a brand you know is in the DB) — after 2+ characters, a suggestions dropdown appears with matching brands/products. Press ↓/↑ to move through it, press Enter on a highlighted brand to navigate to its brand page. Clear the field, type free text, press Enter with nothing highlighted — confirm it navigates to `/search?q=...`.
At mobile width (~375px): confirm the same input appears in its own row directly under the logo/cart/menu row, with the same suggestion behavior. Open the mobile menu (☰) and confirm the search row disappears while the menu is open, and the old duplicate "Search" entry is gone from the menu.
Confirm there are no TypeScript/build errors: run `npm run build` and confirm it completes without errors related to `SiteHeader.tsx` or `SearchAutocomplete.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/SearchAutocomplete.tsx components/SiteHeader.tsx
git commit -m "$(cat <<'EOF'
Make header search always-visible with live suggestions

Replaces the header's click-to-reveal bare search input (desktop and
mobile) with an always-visible input backed by the same brand/product
suggestions used on the homepage search, via a new compact size
variant on SearchAutocomplete rather than a second implementation.
EOF
)"
```
