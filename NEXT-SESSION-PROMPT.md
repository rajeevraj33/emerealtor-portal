# Starter prompt for a new session

Paste the block below into a **new Claude Code session started in this folder**
(`/Users/ryancomp/Downloads/Machine_Learning_Projects/property/portal`), then add
your specific task at the end.

---

```
I'm continuing work on the EME Realtor portal — a property.ca-style GTA real-estate web app
(Next.js 16 App Router + Prisma/SQLite + Tailwind v4) in this folder
(/Users/ryancomp/Downloads/Machine_Learning_Projects/property/portal).

It is LIVE for client testing at https://realtor.alolabs.in
(Oracle box 139.185.50.232, pm2 process `emerealtor`, port 3200, behind a Cloudflare tunnel;
SSH: ssh -i ~/.ssh/oracle_key ubuntu@139.185.50.232).

Before doing anything, read README.md and GO-LIVE-CHECKLIST.md in this folder — they have the
full feature map, the data model, the go-live checklist, demo logins, and (CRITICAL) the
ZERO-DOWNTIME DEPLOY procedure.

CRITICAL deploy rule: the live site is client-facing. NEVER run `npm run build` in ~/emerealtor
on the box while pm2 serves it — it rewrites .next in place and 500s the live site for the whole
~40s build. Always deploy zero-downtime: rsync source, then on the VM build in a STAGING copy
(emerealtor-stage, HARDLINK node_modules via `cp -al` — a symlink breaks Turbopack), then
atomically `mv` .next in and `pm2 restart`. Rollback = move .next.old back. After any deploy,
confirm https://realtor.alolabs.in stays HTTP 200. Backups are in ~/backups on the VM.

Current state (all live): green brand #8cc63f + light-blue accent #2196f3; mint-hexagon "EME Realtor"
logo; real StatsCan 2021 Census city demographics; autosuggest, price slider, Neighbourhoods
mega-dropdown, home market dashboard, home agents showcase, redesigned home-estimator; Rented
category (labelled "Rented" everywhere, not "Leased"); real gender-matched agent headshots
(named overrides for Ruchi Bansal + Rahul Sudan);
conversational lead-capture chatbot; CRM reports (/agent + /console); reseller hierarchy
(super-admin "Add client" -> brokerage-admin "Add agent", tenant-isolated); Featured = staff toggle;
Get Directions + Contact agent on listings; live Gmail SMTP + GA4.

Google OAuth is ENABLED (demo Google project, creds live in .env; redirect URI
https://realtor.alolabs.in/api/auth/google/callback — for go-live swap to the client's own OAuth
client + final-domain redirect URI, then rebuild). Rental properties are labelled "Rented"
everywhere (DB status value is still "Rented"; we standardised the display away from "Leased").

REAL MLS DATA IS LIVE via the AMPRE API (TRREB/PropTx): ~45K active (IDX) + ~71K sold/leased (VOW,
Jan 1 2026 -> today). A nightly cron (CRON_TZ=America/Toronto, `30 3 * * *` = 3:30 AM ET) runs
~/emerealtor/run-sync.sh (incremental: new/changed/sold, de-list expired, prune < Jan-1-2026 floor,
recompute MarketStat). One-time full sold import = ~/emerealtor/run-import-sold.sh (newest-first).
Logs: sync.log (full) + sync-history.log (one line/run). Retention floor = AMPRE_SOLD_SINCE=2026-01-01.
Tokens in .env (AMPRE_*) are dev/test — go-live swaps to the client brokerage's own. SQLite has FK
perf indexes for cascade-deletes (idx_listingmedia_listingid, idx_priceevent_listingid,
idx_listing_canonicalpropertyid) — Prisma does NOT auto-create these; recreate if the DB is reset.
NEVER kill a running sync/import/delete job — diagnose + propose instead (a missing FK index, not a
"stuck" process, was the real cause of a slow delete). Full details in README "AMPRE MLS sync".

Still external/pending (see GO-LIVE-CHECKLIST.md): Stripe keys (MLS IDX/VOW is now LIVE via AMPRE,
above — only the client's own token swap remains). Demographics are real at the city level
(neighbourhood-level needs real boundaries).

Demo logins: platform@emeinfotech.ai/platform123 (super-admin), admin@emeinfotech.ai/admin123
(brokerage), rahul@emeinfotech.ai/agent123 (agent), demo@emeinfotech.ai/password123 (consumer).

My task this session: <describe your change here>
```

---

> Tip: a project memory (`project-eme-realtor-portal-deploy`) also auto-loads with most of this,
> but the prompt above makes the session self-contained even if memory isn't available.
