import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

const PRESETS: Record<string, { brandColor: string; brandColor700: string; brandColor50: string; accentColor: string }> = {
  teal: { brandColor: "#0f3d4c", brandColor700: "#0a2e3a", brandColor50: "#e7f0f2", accentColor: "#d6334b" },
  green: { brandColor: "#14532d", brandColor700: "#0b3d20", brandColor50: "#e8f3ec", accentColor: "#d97706" },
  indigo: { brandColor: "#312e81", brandColor700: "#252261", brandColor50: "#ecebfa", accentColor: "#e11d48" },
  slate: { brandColor: "#1f2937", brandColor700: "#111827", brandColor50: "#eef1f5", accentColor: "#2563eb" },
};

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const brokerageName = (b.brokerageName as string)?.trim();
  const bor = (b.bor as string)?.trim();
  const recoId = (b.recoId as string)?.trim();
  const email = (b.email as string)?.trim().toLowerCase();
  const password = b.password as string;
  const subdomain = (b.subdomain as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const plan = ["starter", "team", "brokerage"].includes(b.plan) ? b.plan : "team";
  const theme = PRESETS[b.theme as string] ? b.theme : "teal";

  if (!brokerageName || !bor || !recoId) return NextResponse.json({ error: "Brokerage name, Broker of Record and RECO # are required." }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Valid admin email required." }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (!subdomain || subdomain.length < 3) return NextResponse.json({ error: "Choose a subdomain (3+ chars)." }, { status: 400 });

  // mock RECO verification
  if (!/^REG-?\d{4,}$/i.test(recoId)) return NextResponse.json({ error: "RECO # looks invalid (expected like REG-1234567)." }, { status: 400 });

  const clash = await prisma.tenant.findFirst({ where: { OR: [{ slug: subdomain }, { subdomain }] } });
  if (clash) return NextResponse.json({ error: "That subdomain is taken." }, { status: 409 });

  const colors = PRESETS[theme];
  const tenant = await prisma.tenant.create({
    data: { slug: subdomain, name: brokerageName, tagline: "Your trusted GTA brokerage.", ...colors, logoText: brokerageName[0].toUpperCase(), subdomain, plan, status: "active" },
  });
  const brokerage = await prisma.brokerage.create({ data: { tenantId: tenant.id, legalName: `${brokerageName}, Brokerage`, tradeName: brokerageName, brokerOfRecord: bor, recoId, routingStrategy: "round-robin" } });
  const team = await prisma.team.create({ data: { tenantId: tenant.id, brokerageId: brokerage.id, name: "Main Team" } });

  const adminUser = await prisma.user.create({ data: { tenantId: tenant.id, email, passwordHash: await bcrypt.hash(password, 10), name: `${bor}`, role: "brokerage_admin", emailVerified: true, vowAcceptedAt: new Date() } });
  // Broker of Record also acts as the first (verified) agent so routing has someone to route to.
  await prisma.agent.create({ data: { tenantId: tenant.id, brokerageId: brokerage.id, teamId: team.id, userId: null, name: bor, title: "Broker of Record", email, photoUrl: `/api/photo?seed=${encodeURIComponent(bor)}&kind=agent`, region: "central", isTeamLead: true, recoVerified: true } });

  await prisma.subscription.create({ data: { tenantId: tenant.id, plan, seats: 1, status: "trialing", pricePerSeat: 99, province: "ON", currentPeriodEnd: new Date(Date.now() + 14 * 86400000) } });
  await prisma.domain.create({ data: { tenantId: tenant.id, host: `${subdomain}.localhost`, isPrimary: true, verified: true, sslStatus: "issued" } });
  await prisma.auditLog.create({ data: { tenantId: tenant.id, actorUserId: adminUser.id, action: "tenant.create", target: brokerageName, detail: `RECO ${recoId} (verified · demo)` } });

  await createSession(adminUser.id);
  const jar = await cookies();
  jar.set("eme_tenant", subdomain, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true });
}
