import type { PrismaClient } from "@prisma/client";

// Recompute MarketStat aggregates from the real Sold/Rented rows in the DB.
// Run nightly against the live VOW feed (see prisma/recompute-market.ts).
// Takes the client as a param so it works both inside Next (singleton) and in a
// standalone tsx cron script.
export async function recomputeMarketStats(db: PrismaClient): Promise<number> {
  const closed = await db.listing.findMany({
    where: { status: { in: ["Sold", "Rented"] }, soldDate: { not: null } },
    select: { status: true, soldPrice: true, soldDate: true, neighbourhood: { select: { citySlug: true, city: true } } },
  });

  type Bucket = { citySlug: string; city: string; month: Date; soldSum: number; soldN: number; rentSum: number; rentN: number };
  const buckets = new Map<string, Bucket>();
  for (const l of closed) {
    if (!l.soldDate || !l.soldPrice) continue;
    const d = new Date(l.soldDate);
    const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const key = `${l.neighbourhood.citySlug}|${month.toISOString()}`;
    let b = buckets.get(key);
    if (!b) { b = { citySlug: l.neighbourhood.citySlug, city: l.neighbourhood.city, month, soldSum: 0, soldN: 0, rentSum: 0, rentN: 0 }; buckets.set(key, b); }
    if (l.status === "Sold") { b.soldSum += l.soldPrice; b.soldN++; } else { b.rentSum += l.soldPrice; b.rentN++; }
  }

  let n = 0;
  for (const b of buckets.values()) {
    const data = {
      avgSoldPrice: b.soldN ? Math.round(b.soldSum / b.soldN) : 0,
      salesCount: b.soldN,
      avgRentPrice: b.rentN ? Math.round(b.rentSum / b.rentN) : 0,
      rentCount: b.rentN,
    };
    const existing = await db.marketStat.findFirst({ where: { citySlug: b.citySlug, month: b.month } });
    if (existing) await db.marketStat.update({ where: { id: existing.id }, data });
    else await db.marketStat.create({ data: { citySlug: b.citySlug, city: b.city, month: b.month, ...data } });
    n++;
  }
  return n;
}
