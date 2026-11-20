import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PROVINCES } from "@/lib/tax";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "brokerage_admin" && user.role !== "platform_admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const sub = await prisma.subscription.findUnique({ where: { tenantId: user.tenantId } });
  if (!sub) return NextResponse.json({ error: "no subscription" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (["starter", "team", "brokerage"].includes(body.plan)) { data.plan = body.plan; await prisma.tenant.update({ where: { id: user.tenantId }, data: { plan: body.plan } }); }
  if (Number.isInteger(body.seats) && body.seats >= 1 && body.seats <= 200) data.seats = body.seats;
  if (PROVINCES.includes(body.province)) data.province = body.province;
  if (body.action === "pay") { data.status = "active"; data.currentPeriodEnd = new Date(Date.now() + 30 * 86400000); }

  await prisma.subscription.update({ where: { tenantId: user.tenantId }, data });
  await prisma.auditLog.create({ data: { tenantId: user.tenantId, actorUserId: user.id, action: body.action === "pay" ? "billing.pay" : "billing.update", detail: JSON.stringify(data) } });
  return NextResponse.json({ ok: true });
}
