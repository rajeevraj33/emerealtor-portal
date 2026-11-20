import { PrismaClient } from "@prisma/client";
import { recomputeMarketStats } from "../src/lib/market-recompute";

// Nightly cron entrypoint: `npm run market:recompute`
// On the server, schedule with:  0 2 * * *  cd ~/emerealtor && npm run market:recompute
const db = new PrismaClient();
recomputeMarketStats(db)
  .then((n) => { console.log(`Recomputed ${n} market-stat rows from sold/leased data.`); return db.$disconnect(); })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
