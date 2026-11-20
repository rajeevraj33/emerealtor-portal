import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "platform_admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { tenantId, status } = await req.json().catch(() => ({}));
  if (!["active", "suspended", "cancelled"].includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
  const t = await prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  await prisma.auditLog.create({ data: { tenantId, actorUserId: me.id, action: `tenant.${status}`, target: t.name } });
  return NextResponse.json({ ok: true });
}
