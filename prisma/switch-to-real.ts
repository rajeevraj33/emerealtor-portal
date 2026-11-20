// Replace the seed/demo listings with the real AMPRE-imported data.
// Keeps tenants, agents, users, logins. Rebuilds market stats from the real
// sold/rented rows (local aggregation — no AMPRE download). Idempotent.
//
//   DATABASE_URL="file:./dev.db?connection_limit=1" npx tsx prisma/switch-to-real.ts

import { PrismaClient } from "@prisma/client";
import { recomputeMarketStats } from "../src/lib/market-recompute";

const p = new PrismaClient();

const chunk = <T>(a: T[], n = 500) => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

(async () => {
  const imp = await p.agent.findFirst({ where: { email: "ruchi2571@gmail.com" } });
  if (!imp) throw new Error("No import agent — real data not imported yet.");

  const real = await p.listing.count({ where: { agentId: imp.id } });
  const seed = await p.listing.count({ where: { agentId: { not: imp.id } } });
  console.log(`real listings: ${real}  ·  seed listings to remove: ${seed}`);
  if (real === 0) throw new Error("Refusing to wipe seed when there is no real data.");

  // 1. detach/remove dependents that don't cascade, then delete seed listings
  await p.booking.deleteMany({ where: { listing: { agentId: { not: imp.id } } } });
  await p.lead.updateMany({ where: { listing: { agentId: { not: imp.id } } }, data: { listingId: null } });
  const del = await p.listing.deleteMany({ where: { agentId: { not: imp.id } } }); // cascades media, priceEvents, favourites
  console.log(`✓ deleted ${del.count} seed listings`);

  // 2. orphaned canonical properties
  const oc = await p.canonicalProperty.deleteMany({ where: { listings: { none: {} } } });
  console.log(`✓ deleted ${oc.count} orphan canonical properties`);

  // 3. empty neighbourhoods (+ their schools) — leaves only neighbourhoods that have real listings
  const empty = await p.neighbourhood.findMany({ where: { listings: { none: {} } }, select: { id: true } });
  const ids = empty.map((e) => e.id);
  for (const c of chunk(ids)) await p.school.deleteMany({ where: { neighbourhoodId: { in: c } } });
  for (const c of chunk(ids)) await p.neighbourhood.deleteMany({ where: { id: { in: c } } });
  console.log(`✓ deleted ${ids.length} empty neighbourhoods`);

  // 4. rebuild MarketStat from real sold/rented only
  await p.marketStat.deleteMany({});
  const months = await recomputeMarketStats(p);
  console.log(`✓ rebuilt MarketStat: ${months} city-months from real sales`);

  // 5. feature a dozen nice real active listings (home "Showcased" section)
  await p.listing.updateMany({ data: { isFeatured: false } });
  const showcase = await p.listing.findMany({
    where: { agentId: imp.id, status: "Active", media: { some: {} }, listPrice: { gte: 700000, lte: 4000000 } },
    orderBy: { listedAt: "desc" }, take: 12, select: { id: true },
  });
  await p.listing.updateMany({ where: { id: { in: showcase.map((s) => s.id) } }, data: { isFeatured: true } });
  console.log(`✓ featured ${showcase.length} real active listings`);

  // summary
  const [active, sold, nbs, ms] = await Promise.all([
    p.listing.count({ where: { status: "Active" } }),
    p.listing.count({ where: { status: { in: ["Sold", "Rented"] } } }),
    p.neighbourhood.count(),
    p.marketStat.count(),
  ]);
  console.log(`\n📊 LIVE DATA NOW: ${active} active · ${sold} sold/rented · ${nbs} neighbourhoods · ${ms} market-months`);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
