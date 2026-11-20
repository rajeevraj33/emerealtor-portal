import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUserId, getCurrentUser, createSession } from "@/lib/session";

const IMP = "eme_impersonator";

export async function POST(req: NextRequest) {
  const { userId, action } = await req.json().catch(() => ({}));
  const jar = await cookies();

  if (action === "exit") {
    const original = jar.get(IMP)?.value;
    if (!original) return NextResponse.json({ error: "not impersonating" }, { status: 400 });
    await createSession(original);
    jar.delete(IMP);
    jar.delete("eme_tenant");
    await prisma.auditLog.create({ data: { actorUserId: original, action: "impersonate.end", target: null } });
    return NextResponse.json({ ok: true });
  }

  // start impersonation — platform admins only
  const me = await getCurrentUser();
  if (!me || me.role !== "platform_admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const target = await prisma.user.findUnique({ where: { id: userId }, include: { tenant: true } });
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const currentUid = await getUserId();
  if (currentUid && !jar.get(IMP)) jar.set(IMP, currentUid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 4 });
  await createSession(target.id);
  jar.set("eme_tenant", target.tenant.slug, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 4 });
  await prisma.auditLog.create({ data: { tenantId: target.tenantId, actorUserId: currentUid ?? null, action: "impersonate.start", target: target.email, detail: `as ${target.role}` } });
  return NextResponse.json({ ok: true });
}
