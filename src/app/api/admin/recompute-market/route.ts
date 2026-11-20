import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { recomputeMarketStats } from "@/lib/market-recompute";

// Manual trigger for the market-stats recompute (super admin only).
export async function POST() {
  const me = await getCurrentUser();
  if (!me || me.role !== "platform_admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await recomputeMarketStats(prisma);
  return NextResponse.json({ ok: true, rows });
}
