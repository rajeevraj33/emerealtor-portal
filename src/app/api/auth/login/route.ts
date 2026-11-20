import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActiveTenantId } from "@/lib/tenant";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email as string)?.trim().toLowerCase();
  const password = body.password as string;
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const tenantId = await getActiveTenantId();
  const user = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
