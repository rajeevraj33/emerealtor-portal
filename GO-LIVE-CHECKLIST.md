# EME Realtor — Go-Live Checklist

Everything currently set to **demo / placeholder** values, and what to swap once the
client is finalized. Grouped by who provides it. The **app code is already built for
all of this** — these are configuration/data swaps, not new development.

---

## 1. Things YOU (or the client) provide — accounts & keys

| Item | Current (demo) | Swap to | Where to change |
|------|----------------|---------|-----------------|
| **Email (SMTP)** | `rajeevraj22@gmail.com` + Gmail App Password | Client's email/App Password, or a transactional provider (SendGrid/Postmark) | `.env` → `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `LEADS_NOTIFY_EMAIL` |
| **Google Analytics (GA4)** | `G-SW3WN43XMD` | Client's GA4 Measurement ID | `.env` → `NEXT_PUBLIC_GA_ID` |
| **Google OAuth ("Sign in with Google")** | ✅ **enabled** (demo Google project for `rajeevraj22@gmail.com`, client ID `795534473415-…`; redirect URI `https://realtor.alolabs.in/api/auth/google/callback`). | The **client's own** OAuth client + redirect URI for the **final domain** (`https://<final-domain>/api/auth/google/callback`); then **Publish** the consent screen | `.env` → replace `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (`NEXT_PUBLIC_*` is build-time — **rebuild** after changing). |
| **Stripe (billing)** | mock checkout | Real publishable + secret keys | `.env` (+ wire `src/lib/tax.ts` / billing to Stripe) |
| **Session secret** | dev placeholder | `openssl rand -base64 48` | `.env` → `SESSION_SECRET` |

---

## 2. The big one — MLS data feed ✅ LIVE (AMPRE / TRREB)

Connected to the **AMPRE** API (TRREB/PropTx) for **both IDX and VOW** — serving **real MLS data** as of 2026-06-24:

| Item | Status | Detail |
|------|--------|--------|
| **Listings (IDX)** | ✅ live | ~45K real active GTA listings + photos (`StandardStatus eq 'Active'`). |
| **Sold/Rented (VOW)** | ✅ live | ~71K real sold/leased, **Jan 1 2026 → today** (price/status history, comparables). MLS calls rentals "Leased"; the UI shows "Rented". |
| **Market metrics** | ✅ live | Real `MarketStat` recomputed from the imported sales (Jan–Jun 2026). |
| **Nightly sync** | ✅ scheduled | Cron `30 3 * * *` (`CRON_TZ=America/Toronto` → 3:30 AM ET) runs `~/emerealtor/run-sync.sh` (incremental: new/changed/sold, de-list expired, prune < Jan-1-2026 floor, recompute). Logs → `sync.log` + one-line `sync-history.log`. |

**Go-live swap:** the feed currently uses the **dev/test AMPRE tokens** in `.env` (`AMPRE_BASE_URL`, `AMPRE_IDX_TOKEN`, `AMPRE_VOW_TOKEN`). For launch, replace with the **client brokerage's own** AMPRE/TRREB credentials.

**Sync controls (env):** `AMPRE_SOLD_SINCE` (absolute floor, currently `2026-01-01`) or `AMPRE_SOLD_MONTHS` (rolling, default 6); `AMPRE_STATS_MONTHS` (default 24). Full details in README → **"AMPRE MLS sync"**.

> We do **not** scrape property.ca/realtor.ca/MLS (licensing). Each brokerage tenant needs its own IDX/VOW (AMPRE) agreement; the platform is the approved technology provider.

---

## 3. Branding & domain (client decisions)

| Item | Current | Swap to |
|------|---------|---------|
| **Name** | EME Realtor | Client's final name — see README "Rebrand (one pass)" |
| **Logo** | mint hexagon + wordmark (`src/components/Logo.tsx`) | Client's logo |
| **Colours** | brand green `#8cc63f`, accent blue `#2196f3` | Client's palette (Tenant.brandColor / accentColor) |
| **Domain** | `realtor.alolabs.in` (test, Cloudflare tunnel) | Client's final domain + DNS + SSL. Update the OAuth redirect URI + any `APP_ORIGIN`. |

---

## 4. Production hardening (optional, for scale)

| Item | Current (demo) | Production |
|------|----------------|------------|
| **Database** | SQLite | PostgreSQL (+ PostGIS for geo) |
| **Hosting** | Oracle free A1 box + pm2 + Cloudflare tunnel | Same, or managed infra; CI/CD |
| **Maps** | OpenStreetMap tiles (free) | Mapbox / MapTiler if high traffic (paid tiers) |
| **RECO verification** | format check (mock) | Real RECO registration check at onboarding |
| **Custom-domain SSL** | simulated | Real ACME/Let's Encrypt at the edge |
| **Demographics** | real StatsCan 2021 at **city** level | + real **neighbourhood** boundaries for per-area Census |

---

## 5. Compliance sign-off (before public launch)

- [ ] Confirm the **VOW data agreement** (TRREB) and the IDX-vs-VOW field split.
- [ ] **CASL** — verify unsubscribe flow + consent records.
- [ ] **PIPEDA / TRESA** — privacy policy content, brokerage legal name + RECO on every white-label site.
- [ ] MLS®/REALTOR® attribution + "deemed reliable but not guaranteed" disclaimers (already rendered).

---

## TL;DR — minimum to go live for one brokerage
1. Final **domain** + DNS/SSL.
2. **MLS IDX/VOW feed** — ✅ already connected & live via **AMPRE** (running on dev tokens); for go-live swap to the client brokerage's own AMPRE/TRREB credentials.
3. Client's **email** (SMTP) + **GA4** ID.
4. *(optional)* Google OAuth client, Stripe keys.
5. Rebrand (name/logo/colours).
6. Strong `SESSION_SECRET`.

Everything else (search, listings UI, VOW gating, CRM, chatbot, reseller hierarchy, mortgage/LTT, demographics display) is **already built and working**.
