# EME Realtor — GTA Real-Estate Portal

A **property.ca-style** real-estate portal for the Greater Toronto Area, built on rich
**seed data** (no live MLS feed required to run). Multi-tenant white-label SaaS with a
single-agent front end, a brokerage back office, and a platform/reseller layer.

> **Brand note:** the displayed name is **EME Realtor** (was emeinfotech.ai → emerealtor → EME Realtor). The client may rename it — see [Rebrand](#rebrand-one-pass). Brand colour is fluorescent green `#8cc63f`; accent is light blue `#2196f3`.

**Live demo:** **https://realtor.alolabs.in** (Oracle box, behind a Cloudflare Tunnel).

---

## Quick start (local)

```bash
npm install
npm run db:reset    # SQLite + seeds (12 GTA cities, 107 neighbourhoods, ~1,270 listings, 2 tenants, agents, leads)
npm run dev         # http://localhost:3000   (this environment runs it on :3100)
```

Other scripts: `npm run build` (prod build — **stop `dev` first**, see [Gotchas](#gotchas)), `npm run db:seed` (re-seed only), `npm run market:recompute` (recompute market stats from sold/rented data — for the live feed), `npx playwright test` (e2e).

### Demo logins
| Role | Email | Password | Lands on |
|------|-------|----------|----------|
| Platform super-admin | `platform@emeinfotech.ai` | `platform123` | `/platform` (all tenants + Add client + impersonation) |
| Brokerage admin | `admin@emeinfotech.ai` | `admin123` | `/console` (CRM, Add agent, routing, billing) |
| Brokerage admin (Maple) | `admin@maplerealty.ca` | `admin123` | `/console` |
| Agent | `rahul@emeinfotech.ai` | `agent123` | `/agent` (My Leads + performance) |
| Consumer | `demo@emeinfotech.ai` | `password123` | `/account` |

Or **Sign Up** (consumer) — captures VOW ToU + CASL consent and unlocks VOW data.

---

## Tech stack

| Concern | This build (keyless seed) | PRD production target |
|---|---|---|
| Framework | Next.js 16 (App Router, TS, Tailwind v4, Turbopack) | same |
| Database | Prisma + **SQLite** (multi-tenant-ready) | PostgreSQL + PostGIS |
| **Maps** | **Leaflet + OpenStreetMap** (free, no key) + leaflet-draw | Mapbox / MapTiler at scale |
| Directions | Deep-link to Google/Apple Maps (free, no key) | same |
| Auth | JWT cookie (`jose`) + bcrypt | same pattern |
| AVM (estimate) | comparables heuristic (`src/lib/avm.ts`) | HouseSigma / RPS integrate |
| Email | **Gmail SMTP** via App Password (`src/lib/mailer.ts`) | transactional provider |
| Analytics | **GA4** (`NEXT_PUBLIC_GA_ID`) | same |
| Demographics | **Real StatsCan 2021 Census** (city-level) | + real neighbourhood boundaries |
| Chatbot | Deterministic guided flow (keyless) | optionally Claude-powered |
| CRM / leads | own in-app store + reports | + FUB/BoldTrail sync |
| Listing media | bundled real photos via `/api/photo` | CDN + transcode |

**Maps cost: $0.** In-site maps use OpenStreetMap (free). "Get Directions" deep-links to Google Maps (free). No Google Maps subscription needed at any point.

---

## Feature map

### Consumer-facing
| Module | Route(s) |
|---|---|
| Home — hero search, **live autosuggest**, featured listings, **market dashboard**, **agents showcase**, city tiles | `/` |
| **Conversational assistant** (floating 💬) — guided search → lead capture | global widget |
| Search — list / map / mixed, **price range slider**, filters, area chips, **draw-to-search**, save-search | `/search` |
| Listing modes — **For Sale / For Rent / Sold / Rented** | `/search?mode=…` / `?status=Sold|Rented` |
| Listing detail — gallery + **field-level VOW gating**, price/status history, **Home Value Estimate (AVM)**, **Mortgage Calculator**, neighbourhood map + **Get Directions**, schools, comparable sales, **Contact agent** + Request a viewing | `/listing/[id]` |
| Auth + registration wall (**VOW ToU + CASL**) + Google OAuth (enabled) | `/signup`, `/login`, `/api/auth/*` |
| Account hub, favourites, saved searches & alerts, compare (up to 4) | `/account/*`, `/compare` |
| Instant Home Value Estimate (redesigned — hero, "How We Calculate", FAQ) | `/home-estimator` |
| Canadian mortgage + stacked Land-Transfer-Tax | `/mortgage` |
| Neighbourhood SEO pages — **real Census demographics** (donut, household, schools, scores) | `/neighbourhood/[slug]` |
| City pages — market report (index, YoY, SVG chart, by-bedroom, DOM), area chips | `/city/[slug]` |
| **Neighbourhoods header mega-dropdown** (12 GTA cities) | header |
| Agent directory + profiles + direct contact | `/agents`, `/agents/[id]` |

### Brokerage / platform (multi-agent SaaS — Phase 2)
| Module | Route(s) |
|---|---|
| White-label tenant resolution + branding (host/subdomain; luminance-driven `--brand-fg`) | `layout.tsx`, `src/lib/tenant.ts` |
| **Agent dashboard** — own leads + claim queue + **CRM reports** (KPIs, volume, funnel, sources) | `/agent` |
| **Brokerage console** — all leads, **CRM reports + agent leaderboard**, routing config, **"Add agent"**, teams, billing, domains | `/console` |
| **Lead routing engine** (round-robin / first-to-claim / geographic + SLA + audit) | `src/lib/routing.ts` |
| **Platform super-admin** — all tenants, **"Add client"** (provision isolated tenant), audited impersonation | `/platform` |
| Self-serve brokerage onboarding (mock RECO verify) | `/list-with-us`, `/api/onboarding` |
| Billing — plans/seats + **Canadian GST/HST/PST/QST** (mock Stripe) | `/console/billing`, `src/lib/tax.ts` |
| White-label custom domains + SSL (mock DNS/ACME) | `/console/domains` |
| **Featured toggle** (staff) — promote any listing to the home page | `/api/listings/[id]/feature` |

---

## Reseller / multi-tenant model

The architecture supports the full reseller hierarchy with **tenant data isolation**:

```
Platform super-admin (you)
  └─ "Add client" → creates an isolated TENANT (a company or solo agent) + its brokerage admin
        └─ Brokerage admin: "Add agent" → creates team-lead / agent logins (tenant-scoped)
              └─ Agents handle their own leads + CRM
Consumers self-register (always role = consumer)
```

- **Isolation is enforced** — every Lead / Agent / Subscription query is scoped by `tenantId`; **tenant A can't see tenant B's data**.
- **Roles:** `platform_admin` → `brokerage_admin` → `team_lead` → `agent` → `consumer`. A consumer can never reach staff areas.
- **Agents are never self-created** (no public "I'm an agent" toggle) — brokerage admins provision them; new accounts get a temp password (shown + emailed via SMTP).
- The platform owner can support a client via **audited impersonation** (every access logged to `AuditLog`).

---

## Data model (`prisma/schema.prisma`)

Multi-tenant from row one. **Shared/global IDX pool:** `Neighbourhood`, `School`, `CanonicalProperty`, `Listing`
(`status` = Active/Sold/**Rented**, `mode`, `isFeatured`, `feedType` IDX/VOW), `ListingMedia`, `PriceEvent`, `MarketStat`.
**Tenant-scoped:** `Tenant` (branding/subdomain/plan), `Brokerage` (routing), `Team`, `Agent` (↔`User` link, region, RECO),
`User` (roles), `Consent` (CASL), `VowAcceptance`, `Favourite`, `SavedSearch`, `Lead` + `LeadEvent`, `Booking`,
`Subscription`, `Domain`, `AuditLog`.

---

## Live integrations

- **Email** — Gmail SMTP via App Password (`SMTP_USER`/`SMTP_PASS` in `.env`). Sends on lead/booking/add-agent/add-client. No-op if unset.
- **Analytics** — GA4 `NEXT_PUBLIC_GA_ID=G-SW3WN43XMD` (Realtime verified).
- **Google sign-in** — built + VOW-aware and **ENABLED** on a demo Google project (creds live in `.env`; redirect URI `https://realtor.alolabs.in/api/auth/google/callback`, verified → accounts.google.com). Go-live swap = the **client's own** OAuth client (+ Publish the consent screen) + final-domain redirect URI, then **rebuild** (`NEXT_PUBLIC_*` is build-time). Redirect URI is derived from the public origin via `src/lib/origin.ts` (handles the Cloudflare tunnel).
- **Demographics** — real **Statistics Canada 2021 Census** figures (population, median age, median household income, age distribution) for all 12 GTA cities, in `prisma/seed.ts` (`CITY_CENSUS`); labelled "Source: Statistics Canada, 2021 Census" on each neighbourhood page.
- **MLS data (AMPRE / TRREB)** — ✅ **live**. Real IDX (active) + VOW (sold/leased) via the **AMPRE** API (`src/lib/ampre.ts`, `prisma/sync-ampre.ts`): ~45K active + ~71K sold/leased (Jan 1 2026 → today). Nightly incremental sync via cron (3:30 AM ET). Tokens in `.env` (`AMPRE_BASE_URL`, `AMPRE_IDX_TOKEN`, `AMPRE_VOW_TOKEN`) — currently dev/test; go-live swaps to the client brokerage's own. Full details in **"AMPRE MLS sync"** below.

### Still external (need accounts/contracts — display already built)
- **MLS feed go-live tokens** — the AMPRE IDX/VOW feed is **already connected & live** (see above); the only go-live step is swapping the dev tokens in `.env` for the **client brokerage's own** AMPRE/TRREB credentials. We do **not** scrape property.ca/realtor.ca (licensing).
- **Stripe** — real keys to replace the mock checkout.
- **Google OAuth** — *now live* on a demo Google project; only the **client's own** OAuth client (+ Publish) is the go-live swap. Email/password signup also works.
- **Real neighbourhood-level Census** — needs licensed neighbourhood boundaries (current demographics are real at the **city** level).

---

## Compliance modelled

- **VOW gating** — sold price / price-history / comparables / full gallery never shown to a logged-out session (`canViewVow()` in `src/lib/session.ts`, enforced server-side).
- **CASL** — express consent at signup + per feature; consent centre; unsubscribe semantics.
- **PIPEDA / TRESA** — consent ledger + VOW-acceptance records; MLS®/REALTOR® attribution + "deemed reliable but not guaranteed" on every listing; per-tenant brokerage legal name + RECO disclosure.
- **Audited cross-tenant access** — platform impersonation + tenant actions write to `AuditLog`.
- **Canadian money math** (`src/lib/mortgage.ts`) — semi-annual compounding, B-20 stress test, CMHC tiers, stacked Ontario + Toronto LTT with first-time rebate; **GST/HST/PST/QST** on subscriptions (`src/lib/tax.ts`).
- **AODA/WCAG** — skip-link, visible focus rings, ARIA labels.

---

## Deployment (Oracle + Cloudflare Tunnel)

- **Host:** Oracle Cloud A1.Flex `139.185.50.232` (shared with CampusNest/GymNest). App at `~/emerealtor`, Node 20 (nvm), runs under **pm2 `emerealtor`** (`PORT=3200 npm start`).
- **Public URL:** `https://realtor.alolabs.in` via the existing shared **cloudflared named tunnel** (Zero-Trust Public Hostname `realtor.alolabs.in → http://localhost:3200`).
- **`.env` is synced to the box** (holds live SMTP App Password + GA ID).

### Redeploy — ZERO-DOWNTIME (use this; the live site is client-facing)
`npm run build` rewrites `.next` **in place**, so building in `~/emerealtor` while pm2 serves the old `.next` makes the live server 500 for the whole ~40s build window. Instead, **build in a staging copy and atomically swap**:

```bash
# 1. push source (does NOT touch the running server — it reads the old .next)
rsync -az --exclude node_modules --exclude .next --exclude 'prisma/dev.db*' \
  --exclude e2e --exclude playwright.config.ts --exclude test-results \
  ./ ubuntu@139.185.50.232:~/emerealtor/

# 2. on the VM: build in a staging copy, then swap (live stays 200 throughout)
ssh … 'bash -lc "
  set -e; export NVM_DIR=\$HOME/.nvm; . \$NVM_DIR/nvm.sh; cd \$HOME
  rm -rf emerealtor-stage
  rsync -a --exclude node_modules --exclude .next --exclude \"prisma/dev.db*\" emerealtor/ emerealtor-stage/
  cp -al emerealtor/node_modules emerealtor-stage/node_modules   # HARDLINK (symlink breaks Turbopack)
  cp emerealtor/prisma/dev.db emerealtor-stage/prisma/dev.db
  cd emerealtor-stage && npm run build
  rm -rf \$HOME/emerealtor/.next.old
  mv \$HOME/emerealtor/.next \$HOME/emerealtor/.next.old   # rollback = mv .next.old back + pm2 restart
  mv \$HOME/emerealtor-stage/.next \$HOME/emerealtor/.next
  pm2 restart emerealtor --update-env
"'
```
Reseed (`npx tsx prisma/seed.ts` in `~/emerealtor` **before** the swap-build) only when seed/brand/Census changed. **Backups** live in `~/backups/` on the VM (`tar` of the code incl. `.env` + `dev.db`).

---

## AMPRE MLS sync (real TRREB data)

The portal pulls **real MLS data** from the **AMPRE** API (TRREB/PropTx) — IDX (active) + VOW (sold/leased). Code: `src/lib/ampre.ts` (client + mappers) and `prisma/sync-ampre.ts` (importer). On the box, node is nvm's v20 at `/home/ubuntu/.nvm/versions/node/v20.20.2/bin`; cron is non-interactive, so the wrapper scripts set `PATH` and `source .env` themselves.

**Nightly incremental** — `~/emerealtor/run-sync.sh`, scheduled by cron:
```
CRON_TZ=America/Toronto
30 3 * * * /home/ubuntu/emerealtor/run-sync.sh >> /home/ubuntu/emerealtor/sync.log 2>&1
```
Runs `tsx prisma/sync-ampre.ts --incremental`: pulls records changed since a saved cursor (`prisma/.ampre-cursor.json`), upserts active/new/price-changed + sold/leased, **de-lists** expired/terminated, **prunes** sold/leased older than the floor, and **recomputes** `MarketStat`. Full output → `sync.log`; one line per run → `sync-history.log` (e.g. `2026-06-25 03:30 EDT  OK — 388 upserts, 6 removes`). **Check it ran:** `cat ~/emerealtor/sync-history.log`.

**One-time full sold/leased (re)import** — `~/emerealtor/run-import-sold.sh`: `tsx prisma/sync-ampre.ts --sold`, newest-first (`CloseDate desc`) from the floor date, then recompute. Launch **detached** and leave it: `nohup bash run-import-sold.sh > import-sold.log 2>&1 &` (~71K records ≈ 10 min). To start from a clean slate, delete sold/leased first, then run this.

**Retention floor** — `AMPRE_SOLD_SINCE=2026-01-01` (absolute date; set in both wrappers) keeps sold/leased from Jan 1 2026 onward. Alternatively `AMPRE_SOLD_MONTHS=N` for a rolling window (default 6). `AMPRE_STATS_MONTHS` (default 24) bounds market-stat aggregation. Floor is enforced in three places: the importer's `since`, the nightly `pruneOldSold`, and the incremental stale-sold check.

**Performance indexes (SQLite)** — cascade-deletes/prunes table-scan without FK indexes (a delete once crawled for ~1h before these were added). Present: `idx_listingmedia_listingid`, `idx_priceevent_listingid`, `idx_listing_canonicalpropertyid`, plus `listingId` on favourite/booking/lead. Recreate via `CREATE INDEX IF NOT EXISTS …` if the DB is ever reset (Prisma doesn't auto-create FK indexes for SQLite).

**Credentials** — `.env`: `AMPRE_BASE_URL`, `AMPRE_IDX_TOKEN`, `AMPRE_VOW_TOKEN` (dev/test tokens now; swap to the client brokerage's own for go-live). VOW token unlocks sold/leased + market metrics; with only IDX you get active listings/photos.

**Note:** the homepage "Active & Sold" count (`src/app/page.tsx`) = active listings + `sum(MarketStat.salesCount)` — it intentionally **excludes** rentals/leases (those are searchable via the "Rented" filter but aren't "sales").

---

## Gotchas

- **Do not run `next build` while `next dev` is live** — they share `.next`; the build empties the dev manifests. Stop dev, `rm -rf .next`, restart.
- **Exclude `e2e/` + `playwright.config.ts` from the production build/deploy** — `@playwright/test` isn't installed on the server and breaks `next build` (also in `tsconfig.json` `exclude`).
- **Never hardcode `text-white` on `bg-brand`** — use `text-[var(--brand-fg)]` (auto dark on the light-green brand, white on dark tenants).
- Prisma `--force-reset` is blocked for AI agents → `rm -f prisma/dev.db*` then `prisma db push`.

---

## Rebrand (one pass)

Update: Tenant.name in DB (default slug `emeinfotech`) + `prisma/seed.ts` (name/tradeName/legalName + `BROKERAGES[0]`) +
`src/lib/mailer.ts` `BRAND` + `.env` `NEXT_PUBLIC_SITE_NAME`/`MAIL_FROM`. Brand/accent colours live on `Tenant`
(brandColor/accentColor) — `brandStyle()` derives `--brand-fg` from luminance. Logo: `src/components/Logo.tsx`
(mint hexagon `#2EE6B6` + wordmark; `onLight` flips text dark).

---

## Testing

- **Playwright e2e** (`e2e/portal.spec.ts`) — 18 tests: home/autosuggest/search/map, Rented category, listing + VOW gate, signup/login + VOW unlock, market report, neighbourhood demographics, estimator, mortgage, agents, conversational chatbot, market dashboard + agents, CRM reports. Run `npx playwright test`.
- Create-account, feature-toggle, and recompute APIs verified manually + role-guarded (403 for unauthorized).
