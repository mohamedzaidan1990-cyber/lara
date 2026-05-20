# Seasons by B — Scraper Worker

A standalone, long-running scraper worker that populates the shared Neon `products` table with live Selfridges data. The main Next.js app on Vercel reads this table; Vercel cannot run Playwright, so this worker takes care of the heavy lifting.

## What it does

- Runs on a cron schedule (default: **every 6 hours**, `0 */6 * * *`), plus one immediate run on startup.
- Iterates the six store categories (Makeup, Skincare, Bags, Haircare, Accessories, Beauty tools) and scrapes the matching **Selfridges category pages** (pages 1–5, 60 products per page) — category listing pages are less aggressively bot-protected than search results.
- Calculates `price_usd = price_gbp * 1.10 * live_rate` (live rate via Frankfurter, cached 6h, fallback 1.33) and upserts into `products` (on conflict by `product_url`). `deliverable_lebanon` is true for everything except fragrances.
- Logs every run to the `scrape_logs` table, plus a `__summary__` entry per cycle.
- **Stealth / anti-detection**: `playwright-extra` + `puppeteer-extra-plugin-stealth`, randomised viewport (1280–1920 × 800–1080), rotating realistic user agents, `en-GB` locale + `Europe/London` timezone, full browser-like request headers, human-style mouse movement and scrolling, network-idle waits, and 2000–5000 ms delays between requests.
- **Fallback retailers**: if Selfridges returns zero for a category, it falls back to Space NK + Cult Beauty (beauty categories) or Browns (bags/accessories), which have weaker bot protection.
- **Optional proxy**: set `PROXY_URL` to route the browser through a residential proxy.

## Folder layout

```
scraper-worker/
├── index.ts        # Cron entry point + per-run orchestration
├── scraper.ts      # Playwright Selfridges scraper
├── db.ts           # Neon connection, schema bootstrap, upsert helpers
├── package.json    # Separate dependencies (Playwright, node-cron, Neon, ws)
├── tsconfig.json
├── Dockerfile      # mcr.microsoft.com/playwright:v1.40.0-jammy base
├── .dockerignore
├── .env.example
└── README.md       # this file
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string. **Must be the same one used by the main app, and must NOT include `channel_binding=require`** (the pg driver doesn't support it). |
| `CRON_SCHEDULE` | Cron expression. Defaults to `0 */6 * * *` (every 6 hours). |
| `PROXY_URL` | Optional. Residential proxy server, e.g. `http://user:pass@host:port`. When set, the browser routes all traffic through it. |
| `RUN_ONCE` | Set to `1` (or pass `--once`) for a single run, then exit. Useful for ad-hoc backfills. |

Copy `.env.example` → `.env` for local dev.

## Local development

```bash
cd scraper-worker
npm install
npx playwright install chromium

# one-shot run
npm run scrape:once

# scheduled mode (runs immediately then every 6 hours)
npm run dev
```

The worker upserts directly into the same Neon database that the main app talks to, so the storefront will start showing live products as soon as the first run completes.

## Deploying to Railway from GitHub

1. Push this repo to GitHub. The `scraper-worker/` folder ships alongside the Next.js app.
2. In Railway, create a **New Project → Deploy from GitHub repo** and select this repository.
3. After the service is created, open **Settings → Source → Root Directory** and set it to `scraper-worker`. Railway will use the `Dockerfile` in that folder automatically.
4. Open **Variables** and add:
   - `DATABASE_URL` — paste the same Neon connection string used in Vercel.
   - `CRON_SCHEDULE` — `0 */6 * * *` (optional — this is the default).
   - The worker fetches the live GBP→USD rate from Frankfurter — no FX env var required.
5. Click **Deploy**. Railway will build the Docker image (Playwright base image, ~1 GB) and start the worker. The first run kicks off automatically on boot; subsequent runs follow the cron schedule.

> Tip: Railway's free trial provides ~500 hours/month — plenty for a worker that mostly idles between 6-hour cron runs.

## Triggering a manual run

There are a few ways to force a fresh scrape:

- **From the Railway dashboard**: open the deployment, click **Restart**. The worker boots, runs once on startup, then waits for the next cron tick.
- **From the Railway CLI**: `railway up --service seasons-by-b-scraper-worker --detach` redeploys, which triggers a fresh boot run.
- **From your laptop** (one-off, hits the same Neon DB):
  ```bash
  cd scraper-worker
  DATABASE_URL="<paste your prod URL>" npm run scrape:once
  ```

## Viewing logs on Railway

1. Open the project in Railway.
2. Click the worker service → **Deployments** tab.
3. Click the active deployment → **Logs**.

You'll see one block per run:

```
[worker] run started 2026-05-19T08:00:00.000Z
[worker] scraping "charlotte tilbury"
[worker] "charlotte tilbury" → 9 products (9 deliverable), upserted 9
…
[worker] run finished 2026-05-19T08:14:32.000Z total=104 deliverable=98 upserted=104 duration=872s
```

For historical runs, query the `scrape_logs` table directly in Neon:

```sql
select created_at, query, status, results_count
from scrape_logs
where created_at > now() - interval '24 hours'
order by created_at desc;
```

## Build & runtime notes

- The Dockerfile uses `mcr.microsoft.com/playwright:v1.40.0-jammy` so Chromium and all OS dependencies are pre-installed — no `npx playwright install` step is needed in the container.
- `node-cron` keeps the process alive between cron ticks. The worker also calls `process.stdin.resume()` to make sure Railway doesn't reap it as idle.
- All scraper failures are caught per-search-term: one broken Selfridges page never kills the whole run.
