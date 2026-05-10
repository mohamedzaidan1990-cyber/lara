# Lara

A luxury personal-shopper storefront. Customers browse or search Selfridges, Lara sources the items in London and ships to Lebanon in 10–14 working days.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Neon (serverless Postgres) · Playwright (Selfridges scraper).

---

## 1. Local setup

```bash
npm install
# Optional, only needed if you want the live Selfridges scraper to run locally:
npx playwright install chromium
npm run dev
```

App runs on http://localhost:3000.

### Environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (`?sslmode=require` recommended). |
| `ADMIN_PASSWORD` | Password for `/admin/login`. |
| `WHISH_NUMBER` | Whish number shown on payment + info pages. |
| `BANK_IBAN` | IBAN for bank transfer instructions. |
| `BANK_NAME` | Bank name (e.g. `QNB`). |
| `ACCOUNT_HOLDER` | Account holder name. |
| `GBP_TO_USD_RATE` | FX rate used in the markup formula. Defaults to `1.27` if unset. |

> **Do not commit `.env.local`.** It is excluded by `.gitignore`. The DB connection string is treated as a secret.

### Initialise the database

The schema is applied automatically on the first request to most routes via `ensureSchema()`. You can also force it with:

```bash
curl -X POST http://localhost:3000/api/init-db
```

The same endpoint runs idempotent `CREATE TABLE IF NOT EXISTS` statements after deploy.

---

## 2. Pricing model

```
price_usd = price_gbp * 1.10 * GBP_TO_USD_RATE
```

The 10 % is Lara's service margin. Only USD is shown to customers; GBP is kept in the order record for accounting.

---

## 3. Pages

| Route | Audience | Notes |
| --- | --- | --- |
| `/` | Customer | Search bar, category chips, featured catalogue (12 hardcoded items shown until a search runs). |
| `/order` | Customer | 4-step flow (product → details → payment → confirmation). Accepts URL params from product cards. |
| `/info` | Customer | How it works, payment, returns policy, contact. |
| `/admin/login` | Admin | Password form, sets `admin_session` cookie. |
| `/admin` | Admin | Stats + orders table, expandable rows, status + payment-confirmed controls, WhatsApp link per customer. |

## 4. API

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/init-db` | GET / POST | – | Runs schema migrations. |
| `/api/search` | POST | – | `{ query, category }` → product list. Tries Playwright scrape first, falls back to cached `products` rows, then to 8 hardcoded products. |
| `/api/orders` | POST | – | Creates customer + order, returns `LARA-XXXXXX`. |
| `/api/orders` | GET | Admin cookie | Returns all orders joined with customer data. |
| `/api/orders/[id]` | PATCH | Admin cookie | Updates `status` and/or `payment_confirmed`. |
| `/api/admin/login` | POST | – | Sets httpOnly `admin_session=true` cookie on success. |
| `/api/admin/logout` | POST | – | Clears the cookie. |

Order statuses: `pending`, `payment_confirmed`, `ordered_selfridges`, `shipped`, `in_lebanon`, `delivered`, `cancelled`, `refunded`.

---

## 5. Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, import the project. Framework auto-detects as Next.js.
3. Add the env vars from `.env.example` under **Settings → Environment Variables**.
4. Deploy.
5. After the first deploy, hit `https://<your-domain>/api/init-db` once to create tables.

### Heads-up about Playwright on Vercel

Playwright's bundled Chromium does not fit inside a Vercel serverless function (~250 MB limit, no Chromium binary in the runtime). The scraper is intentionally defensive:

1. It tries Playwright. On Vercel this throws.
2. It falls back to cached `products` rows in Neon.
3. If the cache is empty it returns 8 hardcoded fallback products.

If you want a real live scrape in production, run the scraper from a long-running worker (Render, Fly, a self-hosted box, or a GitHub Action on a schedule) and use it to pre-populate the `products` table. The storefront and admin will work on Vercel as-is.

---

## 6. Admin usage

1. Go to `/admin/login`, sign in with `ADMIN_PASSWORD`.
2. Use the status dropdown per row to move an order through the pipeline.
3. Toggle the gold switch to mark a payment as confirmed.
4. Click any row to expand: address, notes, product link, payment screenshot preview, WhatsApp button to message the customer.

---

## 7. File map

```
app/
  page.tsx              # storefront
  layout.tsx            # site shell + fonts + header/footer
  globals.css
  order/page.tsx        # 4-step order flow (server entry)
  order/OrderFlow.tsx   # client component
  info/page.tsx         # policies
  admin/login/page.tsx
  admin/page.tsx        # SSR fetch + auth gate
  admin/AdminDashboard.tsx
  api/
    init-db/route.ts
    search/route.ts
    orders/route.ts
    orders/[id]/route.ts
    admin/login/route.ts
    admin/logout/route.ts
lib/
  db.ts                 # neon client + schema + types
  scraper.ts            # Playwright scraper with cached + hardcoded fallbacks
  featured.ts           # 12 featured + 8 fallback products
  auth.ts               # admin cookie helper
components/
  ProductCard.tsx
  OrderStepper.tsx
  AdminOrderRow.tsx
```
