import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendMail } from "@/lib/mailer";

// Super admin provisions a brand-new client (company or solo agent) = its own
// isolated tenant + brokerage admin. Does NOT touch the super admin's session.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "platform_admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const brokerageName = (b.brokerageName as string)?.trim();
  const bor = (b.bor as string)?.trim();
  const email = (b.email as string)?.trim().toLowerCase();
  const recoId = (b.recoId as string)?.trim() || "REG-0000000";
  let subdomain = (b.subdomain as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const plan = ["starter", "team", "brokerage"].includes(b.plan) ? b.plan : "team";

  if (!brokerageName || !bor || !email) return NextResponse.json({ error: "Company name, admin name and email are required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Valid admin email required." }, { status: 400 });
  if (!subdomain) subdomain = brokerageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  if (subdomain.length < 3) return NextResponse.json({ error: "Subdomain must be 3+ characters." }, { status: 400 });

  const clash = await prisma.tenant.findFirst({ where: { OR: [{ slug: subdomain }, { subdomain }] } });
  if (clash) return NextResponse.json({ error: "That subdomain is taken — pick another." }, { status: 409 });

  const colors = { brandColor: "#1f2937", brandColor700: "#111827", brandColor50: "#eef1f5", accentColor: "#2563eb" };
  const tempPassword = "Eme-" + globalThis.crypto.randomUUID().slice(0, 8);

  const tenant = await prisma.tenant.create({
    data: { slug: subdomain, name: brokerageName, tagline: "Your trusted GTA brokerage.", ...colors, logoText: brokerageName[0].toUpperCase(), subdomain, plan, status: "active" },
  });
  const brokerage = await prisma.brokerage.create({ data: { tenantId: tenant.id, legalName: `${brokerageName}, Brokerage`, tradeName: brokerageName, brokerOfRecord: bor, recoId, routingStrategy: "round-robin" } });
  const team = await prisma.team.create({ data: { tenantId: tenant.id, brokerageId: brokerage.id, name: "Main Team" } });
  const adminUser = await prisma.user.create({ data: { tenantId: tenant.id, email, passwordHash: await bcrypt.hash(tempPassword, 10), name: bor, role: "brokerage_admin", emailVerified: true, vowAcceptedAt: new Date() } });
  await prisma.agent.create({ data: { tenantId: tenant.id, brokerageId: brokerage.id, teamId: team.id, userId: null, name: bor, title: "Broker of Record", email, photoUrl: `/api/photo?seed=${encodeURIComponent(bor)}&kind=agent`, region: "central", isTeamLead: true, recoVerified: true } });
  await prisma.subscription.create({ data: { tenantId: tenant.id, plan, seats: 1, status: "trialing", pricePerSeat: 99, province: "ON", currentPeriodEnd: new Date(Date.now() + 14 * 86400000) } });
  await prisma.domain.create({ data: { tenantId: tenant.id, host: `${subdomain}.localhost`, isPrimary: true, verified: true, sslStatus: "issued" } });
  await prisma.auditLog.create({ data: { tenantId: tenant.id, actorUserId: me.id, action: "client.create", target: brokerageName, detail: `provisioned by super admin · ${email}` } });

  sendMail({
    to: email,
    subject: `Your Hunt property brokerage account — ${brokerageName}`,
    html: `<p>Hi ${bor},</p><p>Your brokerage account on Hunt property is ready. Log in with:</p><p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${tempPassword}</p><p>You can then add your own team's agents.</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, email, tempPassword, subdomain });
}
