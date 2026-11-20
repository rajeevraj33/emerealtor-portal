import { PrismaClient } from "@prisma/client";
import { recomputeMarketStats } from "../src/lib/market-recompute";
const p = new PrismaClient();
(async () => {
  for (const q of ["PRAGMA synchronous=OFF","PRAGMA journal_mode=WAL"]) await p.$queryRawUnsafe(q);
  console.log("rebuilding market stats from real sales…");
  await p.marketStat.deleteMany({});
  const n = await recomputeMarketStats(p);
  console.log("✓ MarketStat city-months:", n);
  await p.listing.updateMany({ data: { isFeatured: false } });
  const show = await p.listing.findMany({ where: { status:"Active", media:{some:{}}, listPrice:{gte:700000,lte:4000000} }, orderBy:{listedAt:"desc"}, take:12, select:{id:true} });
  await p.listing.updateMany({ where:{ id:{ in: show.map(s=>s.id) } }, data:{ isFeatured:true } });
  console.log("✓ featured:", show.length);
  const [a,s,f,ms]=await Promise.all([
    p.listing.count({where:{status:"Active"}}),
    p.listing.count({where:{status:{in:["Sold","Rented"]}}}),
    p.listing.count({where:{isFeatured:true}}),
    p.marketStat.count(),
  ]);
  console.log(`\nDONE: ${a} active · ${s} sold/rented · ${f} featured · ${ms} market-months`);
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
