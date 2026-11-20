// Fast, targeted featuring — no full-table update, no slow subquery.
//   DATABASE_URL="file:./dev.db?connection_limit=1" npx tsx prisma/feature.ts
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  await p.$queryRawUnsafe("PRAGMA synchronous=OFF");
  // reset only the few currently-featured rows (fast)
  await p.$executeRawUnsafe(`UPDATE Listing SET isFeatured = 0 WHERE isFeatured = 1`);
  // pick 12 recent active listings in a nice price band and feature them
  await p.$executeRawUnsafe(
    `UPDATE Listing SET isFeatured = 1 WHERE id IN (
       SELECT id FROM Listing
       WHERE status = 'Active' AND listPrice BETWEEN 700000 AND 4000000
       ORDER BY listedAt DESC LIMIT 12)`
  );
  const f = await p.listing.count({ where: { isFeatured: true } });
  const a = await p.listing.count({ where: { status: "Active" } });
  const s = await p.listing.count({ where: { status: { in: ["Sold", "Rented"] } } });
  const ms = await p.marketStat.count();
  console.log(`DONE — ${a} active · ${s} sold/rented · ${f} featured · ${ms} market-months`);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
