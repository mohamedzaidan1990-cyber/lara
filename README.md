# Seasons by B

> London's finest, delivered to your door.

A luxury personal-shopper storefront. Customers browse or search Selfridges, Seasons by B sources items in London and ships to your door in 10–14 working days.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Neon (serverless Postgres) · Playwright (Selfridges scraper) · Resend (email) · Twilio (WhatsApp) · Railway (long-running scraper worker).

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
| `RESEND_API_KEY` | Resend API key. Use `re_placeholder_replace_before_deploy` to disable. |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID. Use `placeholder` to disable. |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token. |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender (e.g. sandbox `whatsapp:+14155238886`). |
| `LARA_WHATSAPP_NUMBER` | Business WhatsApp number to receive order alerts (e.g. `whatsapp:+44…`). |
| `NEXT_PUBLIC_SITE_NAME` | Brand name shown in metadata. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Customer-facing WhatsApp contact number. |

> **Do not commit `.env.local`.** It is excluded by `.gitignore`. The DB connection string is treated as a secret.

### Initialise the database

The schema is applied automatically on the first request to most routes via `ensureSchema()`. You can also force it with:

```bash
curl -X POST http://localhost:3000/api/init-db
```

The same endpoint runs idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` statements after deploy.

---

## 2. Brand & design

- **Name:** Seasons by B
- **Tagline:** London's finest, delivered to your door.
- **Categories:** Beauty, Skincare, Makeup, Haircare, Bags, Accessories.

Colour system:

| Token | Hex | Usage |
| --- | --- | --- |
| Primary | `#F4D360` | warm gold — highlights, accents on dark backgrounds |
| Accent | `#C0392B` | deep red — primary buttons, callouts |
| Dark | `#23272A` | near-black — text, dark surfaces |
| Background | `#FFFDF5` | warm white — page background |

---

## 3. Pricing model

```
price_usd = price_gbp * 1.10 * GBP_TO_USD_RATE
```

The 10 % is Seasons by B's service margin. **Only USD is shown to customers**; GBP is kept in the order record for accounting.

---

## 4. Pages

| Route | Audience | Notes |
| --- | --- | --- |
| `/` | Customer | Search bar, category chips, featured catalogue (12 hardcoded beauty + bags items shown until a search runs), "Why Seasons by B" section. |
| `/order` | Customer | 4-step flow (product → details → payment → confirmation). Step 2 collects full name, phone, email, address, notes. |
| `/info` | Customer | How it works, payment, returns policy, contact. |
| `/admin/login` | Admin | Password form, sets `admin_session` cookie. |
| `/admin` | Admin | Stats + orders table, expandable rows, status + payment-confirmed controls, WhatsApp link per customer. |

## 5. API

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/init-db` | GET / POST | – | Runs schema migrations. |
| `/api/search` | POST | – | `{ query, category }` → product list. Tries Playwright scrape first, falls back to cached `products` rows, then to 8 hardcoded products. |
| `/api/orders` | POST | – | Creates customer + order, returns `LARA-XXXXXX`. Also triggers customer-confirmation email, admin-notification email, and WhatsApp alert to the business number. |
| `/api/orders` | GET | Admin cookie | Returns all orders joined with customer data. |
| `/api/orders/[id]` | PATCH | Admin cookie | Updates `status` and/or `payment_confirmed`. When `payment_confirmed` flips `false → true` it sends a payment-confirmation email and a WhatsApp message to the customer. |
| `/api/admin/login` | POST | – | Sets httpOnly `admin_session=true` cookie on success. |
| `/api/admin/logout` | POST | – | Clears the cookie. |

Order statuses: `pending`, `payment_confirmed`, `ordered_selfridges`, `shipped`, `in_lebanon`, `delivered`, `cancelled`, `refunded`.

---

## 6. Email automation (Resend)

`lib/email.ts` exports three functions, all using `hello@seasonsbyb.co.uk` as the `From` address:

- `sendOrderConfirmation(order, customer)` — to the customer. Subject `Your Seasons by B order — LARA-XXXXXX`. Includes order number, product, USD price, payment instructions (Whish + bank), 10–14 working-day delivery estimate, WhatsApp link.
- `sendOrderNotification(order, customer)` — to `mohamedzaidan1990@gmail.com`. Subject `New order — LARA-XXXXXX — $[price]`. Full customer + product details plus a direct link to `/admin`.
- `sendPaymentConfirmation(order, customer)` — to the customer. Subject `Payment confirmed — SEASONS BY B`. Sent when the admin toggles `payment_confirmed` to `true`.

Setup:

1. Sign up at [resend.com](https://resend.com) and verify the `seasonsbyb.co.uk` domain.
2. Create an API key and put it in `RESEND_API_KEY`.
3. When `RESEND_API_KEY` is left at the `re_placeholder_replace_before_deploy` value, the functions are no-ops (they log a warning) — so the app still runs end-to-end with placeholder credentials.

---

## 7. WhatsApp automation (Twilio)

`lib/whatsapp.ts` exports two functions:

- `sendWhatsAppAlert(order, customer)` — sends a formatted alert to the business number (`LARA_WHATSAPP_NUMBER`), triggered by `POST /api/orders`.
- `sendWhatsAppConfirmation(customerPhone, orderNumber, productName)` — sends a confirmation to the customer when payment is verified, triggered by `PATCH /api/orders/[id]`.

All Twilio calls are wrapped in `try/catch`: if Twilio fails, the order still saves successfully. **Notification failures never block order creation.**

Setup:

1. Sign up at [twilio.com](https://www.twilio.com), go to the WhatsApp sandbox.
2. Activate the sandbox by sending the join code from each phone you want to receive messages on (including the business number).
3. Copy the Account SID, Auth Token, and the sandbox sender (`whatsapp:+14155238886`) into the env.
4. Put the business WhatsApp number into `LARA_WHATSAPP_NUMBER`, formatted as `whatsapp:+44…`.
5. For production, move from the sandbox to a verified WhatsApp Business sender.

When `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` is left at the `placeholder` value, the functions are no-ops.

---

## 8. Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, import the project. Framework auto-detects as Next.js.
3. Add the env vars from `.env.example` under **Settings → Environment Variables**.
4. Deploy.
5. After the first deploy, hit `https://<your-domain>/api/init-db` once to create tables.

### Heads-up about Playwright on Vercel

Playwright's bundled Chromium does not fit inside a Vercel serverless function (~250 MB limit, no Chromium binary in the runtime). The in-app scraper is intentionally defensive:

1. It tries Playwright. On Vercel this throws.
2. It falls back to cached `products` rows in Neon.
3. If the cache is empty it returns the 8 hardcoded fallback products.

For live scrapes in production, run the dedicated **scraper worker on Railway** (see below) — it populates `products` on a 6-hour cron and the storefront reads from there.

---

## 9. Railway scraper worker

The `scraper-worker/` folder is a completely separate, dockerised Node service that scrapes Selfridges on a cron and upserts into the shared Neon `products` table.

See [`scraper-worker/README.md`](scraper-worker/README.md) for full deployment instructions. TL;DR:

1. Push this repo to GitHub.
2. In Railway, create a new service from this repo and set **Root Directory** to `scraper-worker`.
3. Add `DATABASE_URL` and `GBP_TO_USD_RATE` env vars (same values as Vercel).
4. Deploy. Railway uses the included `Dockerfile` (Playwright base image, Chromium pre-installed).
5. Watch logs in the Railway dashboard; query `scrape_logs` in Neon for run history.

Default schedule: every 6 hours. Search terms cover Charlotte Tilbury, La Mer, Dior, Sisley, NARS, YSL, Gucci, Valentino, Loewe, Bottega Veneta, Mulberry, Jo Malone, Elemis, Clinique.

---

## 10. Admin usage

1. Go to `/admin/login`, sign in with `ADMIN_PASSWORD`.
2. Use the status dropdown per row to move an order through the pipeline.
3. Toggle the gold switch to mark a payment as confirmed — this triggers the customer payment-confirmation email and WhatsApp message.
4. Click any row to expand: address, email, notes, product link, payment screenshot preview, WhatsApp button to message the customer.

---

## 11. File map

```
app/
  page.tsx              # storefront + "Why Seasons by B" section
  layout.tsx            # site shell + fonts + header/footer
  globals.css           # design tokens & utilities
  order/page.tsx        # 4-step order flow (server entry)
  order/OrderFlow.tsx   # client component (full_name, phone, email, address)
  info/page.tsx         # policies
  admin/login/page.tsx  # "Seasons by B — Admin"
  admin/page.tsx        # SSR fetch + auth gate
  admin/AdminDashboard.tsx
  api/
    init-db/route.ts
    search/route.ts
    orders/route.ts          # POST triggers email + WhatsApp
    orders/[id]/route.ts     # PATCH triggers payment-confirmation
    admin/login/route.ts
    admin/logout/route.ts
lib/
  db.ts                 # neon client + schema + types
  scraper.ts            # in-app Playwright scraper (fallback)
  featured.ts           # 12 featured beauty + bag products
  auth.ts               # admin cookie helper
  email.ts              # Resend integration
  whatsapp.ts           # Twilio WhatsApp integration
components/
  ProductCard.tsx
  OrderStepper.tsx
  AdminOrderRow.tsx
scraper-worker/
  index.ts              # cron entry + per-run orchestration
  scraper.ts            # standalone Playwright scraper
  db.ts                 # Neon connection + upserts
  package.json
  tsconfig.json
  Dockerfile            # mcr.microsoft.com/playwright base image
  README.md
```
