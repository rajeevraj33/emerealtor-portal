import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { getActiveTenantId } from "@/lib/tenant";
import { routeLead, LEAD_SLA_HOURS } from "@/lib/routing";
import { sendMail, leadConfirmationEmail, leadNotifyEmail, LEADS_NOTIFY } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email } = body;
  if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 });
  const tenantId = await getActiveTenantId();
  const userId = await getUserId();

  // region for geographic routing — from the listing's neighbourhood if present
  let region: string | null = body.region ?? null;
  if (body.listingId) {
    const l = await prisma.listing.findUnique({ where: { id: body.listingId }, include: { neighbourhood: true } });
    region = l?.neighbourhood.slug ?? region;
  }

  // Direct-to-agent (agent directory) bypasses routing; otherwise route by strategy.
  let assignedAgentId: string | null = null;
  let routeNote = "";
  if (body.agentId) {
    const a = await prisma.agent.findFirst({ where: { id: body.agentId, tenantId } });
    if (a) { assignedAgentId = a.id; routeNote = "Direct to agent"; }
  }
  if (!assignedAgentId) {
    const route = await routeLead(tenantId, region);
    assignedAgentId = route.agentId;
    routeNote = route.note;
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId, userId: userId ?? undefined,
      type: body.type === "seller" || body.type === "renter" ? body.type : "buyer",
      name, email, phone: body.phone ?? null, message: body.message ?? null,
      listingId: body.listingId ?? null, assignedAgentId, region,
      slaDueAt: assignedAgentId ? null : new Date(Date.now() + LEAD_SLA_HOURS * 3600000),
      sourcePage: body.sourcePage ?? null, utm: body.utm ? JSON.stringify(body.utm) : null,
    },
  });
  await prisma.leadEvent.create({ data: { leadId: lead.id, type: "created", detail: `Lead from ${body.sourcePage ?? "site"}` } });
  if (assignedAgentId) await prisma.leadEvent.create({ data: { leadId: lead.id, type: "routed", detail: routeNote, agentId: assignedAgentId } });

  // Notify the brokerage + confirm to the consumer (no-op if SMTP isn't configured).
  const listingTitle = lead.listingId
    ? (await prisma.listing.findUnique({ where: { id: lead.listingId }, select: { canonicalProperty: { select: { address: true } }, neighbourhood: { select: { name: true } } } }).then((l) => l && `${l.canonicalProperty.address}, ${l.neighbourhood.name}`)) ?? undefined
    : undefined;
  const notify = leadNotifyEmail({ name, email, phone: lead.phone, message: lead.message, type: lead.type, listingTitle, sourcePage: lead.sourcePage });
  const confirm = leadConfirmationEmail(name, { listingTitle });
  await Promise.allSettled([
    sendMail({ to: LEADS_NOTIFY, subject: notify.subject, html: notify.html, replyTo: email }),
    sendMail({ to: email, subject: confirm.subject, html: confirm.html }),
  ]);

  return NextResponse.json({ ok: true, id: lead.id });
}
