import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const STRATEGIES = ["round-robin", "first-to-claim", "geographic"];

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "brokerage_admin" && user.role !== "platform_admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { strategy } = await req.json().catch(() => ({}));
  if (!STRATEGIES.includes(strategy)) return NextResponse.json({ error: "bad strategy" }, { status: 400 });
  const brokerage = await prisma.brokerage.findFirst({ where: { tenantId: user.tenantId } });
  if (!brokerage) return NextResponse.json({ error: "no brokerage" }, { status: 404 });
  await prisma.brokerage.update({ where: { id: brokerage.id }, data: { routingStrategy: strategy } });
  return NextResponse.json({ ok: true });
}
