import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendMail } from "@/lib/mailer";

// Brokerage admin creates an agent account for their own team (tenant-scoped).
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "brokerage_admin" && me.role !== "platform_admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const name = (b.name as string)?.trim();
  const email = (b.email as string)?.trim().toLowerCase();
  const phone = (b.phone as string)?.trim() || null;
  const region = (b.region as string)?.trim() || "central";
  const isTeamLead = !!b.isTeamLead;
  if (!name) return NextResponse.json({ error: "Agent name is required." }, { status: 400 });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Valid agent email required." }, { status: 400 });

  const tenantId = me.tenantId;
  const exists = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (exists) return NextResponse.json({ error: "A user with that email already exists in your brokerage." }, { status: 409 });

  const brokerage = await prisma.brokerage.findFirst({ where: { tenantId } });
  if (!brokerage) return NextResponse.json({ error: "no brokerage" }, { status: 404 });
  const team = await prisma.team.findFirst({ where: { tenantId } });

  const tempPassword = "Eme-" + globalThis.crypto.randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { tenantId, email, passwordHash: await bcrypt.hash(tempPassword, 10), name, role: isTeamLead ? "team_lead" : "agent", emailVerified: true, vowAcceptedAt: new Date() },
  });
  await prisma.agent.create({
    data: { tenantId, brokerageId: brokerage.id, teamId: team?.id ?? null, userId: user.id, name, email, phone, title: isTeamLead ? "Team Lead" : "Sales Representative", photoUrl: `/api/photo?seed=${encodeURIComponent(name)}&kind=agent`, region, isTeamLead, recoVerified: true },
  });
  await prisma.auditLog.create({ data: { tenantId, actorUserId: me.id, action: "agent.create", target: name, detail: email } });

  sendMail({
    to: email,
    subject: `You've been added to ${brokerage.tradeName}`,
    html: `<p>Hi ${name},</p><p>An agent account was created for you on ${brokerage.tradeName}. Log in with:</p><p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${tempPassword}</p><p>Please change your password after your first login.</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, email, tempPassword });
}
