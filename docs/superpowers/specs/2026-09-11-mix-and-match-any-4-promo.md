# Mix & Match — Any 4 promotion

Date: 2026-09-11

## Goal

A second homepage promotion below the hero: **"Mix & Match — Any 4"**. A
curated edit of ~15 in-stock items. A customer pays the promo price on
these items only when their basket holds **4 or more** of them (mix &
match across brands); with fewer than 4, each is charged at its regular
("retail") price. Each card shows the retail price struck through
(= 2× the promo price per user instruction) with the promo price
highlighted, plus an "Any 4 for this price" label.

## Pricing model

- `products.price_usd` for these rows holds the **promo price** — the
  headline price shown on cards, PDP, search, category pages, SEO.
- `lib/promotions.ts` gets a compare-at entry per row:
  `{ compareAtUsd: <2× promo>, label: "Any 4 for this price" }` — reuses
  the existing strikethrough rendering on ProductCard + PDP.
- `lib/mix-and-match.ts` (new) maps product id →
  `{ promoUsd, promoGbp, retailUsd, retailGbp }`, plus the group id and
  the minimum (4).

## Cart enforcement (client-side)

The order API already trusts client-sent per-item prices and the invoice
renders them, so enforcement lives entirely in the cart:

- `CartItem` gains optional `promo_group`, `promo_price_usd/gbp`,
  `retail_price_usd/gbp`. `ProductCard` / `ProductDetailClient` attach
  these (via `getMixAndMatch(product.id)`) when adding a promo item, and
  set the item's base `price_usd` to the **retail** price (safe default).
- `computeCartPricing(items)` (new, in `lib/cart.ts`): counts promo units
  in the basket; if `>= 4`, promo-group items price at their promo price,
  else at retail. Returns priced items + a `bundle` state
  (`count`, `active`, `unitsToGo`, `savingUsd`) + totals.
- `CartSidebar` and `CheckoutClient` render effective prices and a bundle
  banner ("Add N more…" / "✓ applied — saving $X"). `placeOrder` submits
  `effective_usd/gbp` per line and appends `[Mix & Match: any-4 promo
  applied]` to the order notes when active. No server / schema / invoice
  changes.

## Homepage

`lib/home-promos.ts` gets a second block with `title`, an optional
`note`, and the 15 product ids. `HomePromoSection` renders the note under
the title. The existing stacked-block layout handles it.

## Products (15)

New rows: 3× Gisou lip-oil minis (Gloss Hour: Raspberry Swirl, Bee-llini
Peach, Glazed Plum), 3× Gisou hair-perfume minis (Bee Garden: Wildflower
Honey, Wild Rose, Lavender Berry), Sol de Janeiro Dança Mística mist,
Sephora Blush Blush Blush Trio (Candy Lover), Sephora × Waad Shaat, Fenty
Mini Killawatt (WattaBrat), Tarte Maracuja Juicy Lip Plump (Pink), Fenty
Match Stix Duo (Mocha / I Scream), Huda FAUX FILLER Extra Shine Lip Gloss
(She Fire).

Repriced existing rows: Milk Makeup The Jelly Lip Kit ($54→$30), Rare
Beauty Find Comfort Fragrance Mist ($55→$25).

Promo / retail(2×) / GBP(÷1.3): see `scripts/add-mix-and-match-promo.ts`.
Images: user-supplied, trimmed + padded to 3:4 like the Kiehl's photo;
the two Gisou trios share their set photo.
