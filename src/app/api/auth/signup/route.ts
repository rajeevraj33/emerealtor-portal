import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActiveTenantId } from "@/lib/tenant";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name as string)?.trim();
  const email = (body.email as string)?.trim().toLowerCase();
  const password = body.password as string;
  const vow = !!body.vow;
  const casl = !!body.casl;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (!vow) return NextResponse.json({ error: "You must accept the VOW Terms of Use to create an account." }, { status: 400 });

  const tenantId = await getActiveTenantId();
  const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists. Try logging in." }, { status: 409 });

  const user = await prisma.user.create({
    data: { tenantId, email, name: name || null, passwordHash: await bcrypt.hash(password, 10), emailVerified: true, vowAcceptedAt: new Date(), role: "consumer" },
  });
  await prisma.vowAcceptance.create({ data: { tenantId, userId: user.id, version: "1.0", ip: req.headers.get("x-forwarded-for") ?? null } });
  if (casl) {
    await prisma.consent.create({ data: { tenantId, userId: user.id, type: "express", channel: "email", purpose: "alert", source: "signup", expiresAt: null } });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
