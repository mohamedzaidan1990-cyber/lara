# Design: Full-Bleed Hero Video & Header Search Suggestions

**Date:** 2026-07-22
**Project:** LARA / Seasons by B (`C:\Users\User\LARA`)

---

## Overview

Two independent frontend changes:

1. **Hero video** — convert the homepage hero from a split video/text layout into a full-bleed background video with the headline overlaid on top.
2. **Header search** — replace the header's click-to-reveal bare input with an always-visible input (desktop and mobile) that shows live brand/product suggestions, reusing the existing suggestions component instead of duplicating its logic.

These changes touch only `components/HeroSection.tsx`, `components/AutoVideo.tsx`, `components/SiteHeader.tsx`, and `components/SearchAutocomplete.tsx`. No API or database changes.

---

## 1. Hero Video → Full-Bleed Background

### Current behavior (`components/HeroSection.tsx`)

- `<section>` splits into two columns on desktop (`lg:flex-row`): video on the left at 60% width, text on the right at 40% width. On mobile the video sits above the text at `42vh`.
- Video plays once (`loop={false}`) via `AutoVideo`, with a mute/unmute button in the corner.
- Text (`text-ink`, dark) assumes it's sitting on the light `bg-cream` page background, not on top of footage.

### New behavior

- Single full-width section, `min-h-[92vh]` (or similar — matches roughly the current combined footprint), no column split.
- `AutoVideo` is absolutely positioned to fill the entire section (`wrapperClassName="absolute inset-0"`, `videoClassName="h-full w-full object-cover"`), keeps the existing `hero-kenburns` zoom class.
- `loop` reverts to the default (`true`) so it plays continuously.
- A gradient scrim (`div` absolutely positioned over the video, e.g. `bg-gradient-to-t from-ink/70 via-ink/20 to-transparent` or similar) sits between the video and the text for legibility. Exact gradient stops/opacity tuned visually during implementation.
- The text block (badge, headline, divider, paragraph, CTA buttons, order-count line) is repositioned on top of the video/scrim (e.g. `relative z-10`, flex-positioned within the section — left-aligned at the bottom or centered, decided visually during implementation) and recolored from `text-ink` to white/cream tones so it reads against the video. The accent-colored headline words (`text-accent`) and the pink divider bar can stay as accent colors if they still contrast, otherwise adjust to a lighter accent tint.
- Copy, links (`Shop Now`, `Request Bespoke`), and animations (`framer-motion` fade/stagger) are unchanged — only their container and color scheme change.

### `AutoVideo.tsx` change

- Add an optional prop `showSoundToggle?: boolean` (default `true`). When `false`, the mute/unmute `<button>` is not rendered, and the sound-related effects (`soundOnInteract`, unmute-on-interaction listeners) are skipped since this hero use case has no sound at all.
- `HeroSection.tsx` passes `showSoundToggle={false}` (and no longer passes `buttonSide` or `loop={false}`).
- The other existing caller — `HeroVideo()` in `app/HomeClient.tsx` (the Bespoke section's small video card) — is unaffected since it doesn't pass the new prop and keeps the default (toggle shown, current behavior).

---

## 2. Header Search → Always-Visible Input with Suggestions

### Current behavior (`components/SiteHeader.tsx`)

- Desktop: a search icon button (`aria-label="Search"`) toggles `searchOpen`, which reveals a plain `<input>` in a panel below the header pill. No suggestions — just free text that submits to `/search?q=...`.
- Mobile: same toggle behavior, plus a duplicate search entry point inside the mobile menu.
- Neither surface calls `/api/search-suggestions`.

### New behavior

- **Desktop:** the input is inline in the header pill at all times (no click-to-reveal) — the icon becomes decorative/leading-adornment or is dropped in favor of the input itself always being present with room to type immediately.
- **Mobile:** since the top pill row (logo, cart, menu) has no spare width, add a second compact row directly under it, containing the always-visible search input. This is only removed from view when the mobile menu is open (avoid duplicate search rows), otherwise it's always rendered.
- Both surfaces get live suggestions matching the current homepage search behavior (debounced fetch to `/api/search-suggestions` once the query is ≥2 characters, dropdown listing matching brands then products, keyboard navigation, click/Enter to navigate to a brand/product page, or submit to `/search?q=...`).

### Avoiding duplicated suggestion logic

Rather than re-implementing debounce/fetch/keyboard-nav a second time inside `SiteHeader.tsx`, extend the existing `components/SearchAutocomplete.tsx` (already used on the homepage's "Search the edit" section and on `/search`) with a new prop:

- `size?: "default" | "compact"` (default `"default"`, preserving current homepage/`/search` appearance exactly).
- `"compact"` reduces input padding/font-size/shadow to fit a header pill (roughly `h-9`–`h-10`, smaller placeholder text, no `shadow-soft`, dropdown width matches the input's own width rather than a fixed centered `max-w-2xl`).

`SiteHeader.tsx` renders `<SearchAutocomplete size="compact" ... />` inline in place of its current bare `<input>`/panel, once for desktop and once for the new mobile row (reusing the same `query`/`setQuery`/`onSubmit` pattern already used in `app/HomeClient.tsx`). The old `searchOpen` toggle state, the toggle button's click handler, and the now-redundant search entry in the mobile menu are removed.

---

## Testing / Verification

- No automated tests exist for these components today; verification is manual in the browser (`npm run dev`):
  - Hero: confirm video fills the section on both mobile and desktop widths, loops silently, text is legible, CTAs still link correctly.
  - Header search: confirm input is visible without clicking on both desktop and mobile, typing ≥2 characters shows brand/product suggestions, keyboard nav (↑/↓/Enter/Escape) works, clicking a suggestion navigates correctly, submitting free text goes to `/search?q=...`.
  - Confirm the Bespoke-section video (`HeroVideo` in `HomeClient.tsx`) still shows its sound toggle and behaves exactly as before.
