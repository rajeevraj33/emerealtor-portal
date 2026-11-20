import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { getActiveTenantId } from "@/lib/tenant";
import { routeLead, LEAD_SLA_HOURS } from "@/lib/routing";
import { sendMail, leadConfirmationEmail, leadNotifyEmail, LEADS_NOTIFY } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { listingId, name, email } = body;
  if (!listingId || !name || !email) return NextResponse.json({ error: "listingId, name, email required" }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { neighbourhood: true, canonicalProperty: { select: { address: true } } } });
  if (!listing) return NextResponse.json({ error: "listing not found" }, { status: 404 });

  await prisma.booking.create({
    data: { listingId, name, email, phone: body.phone ?? null, preferredTime: body.preferredTime ?? null, message: body.message ?? null },
  });

  // A viewing request is also a buyer lead — routed to the active tenant's agents.
  const tenantId = await getActiveTenantId();
  const userId = await getUserId();
  const route = await routeLead(tenantId, listing.neighbourhood.slug);
  const lead = await prisma.lead.create({
    data: {
      tenantId, userId: userId ?? undefined, type: "buyer", name, email, phone: body.phone ?? null,
      message: body.message ? `Viewing request: ${body.message}` : "Requested a viewing", listingId,
      assignedAgentId: route.agentId, region: listing.neighbourhood.slug,
      slaDueAt: route.agentId ? null : new Date(Date.now() + LEAD_SLA_HOURS * 3600000),
      sourcePage: body.sourcePage ?? null,
    },
  });
  await prisma.leadEvent.create({ data: { leadId: lead.id, type: "created", detail: "Viewing request" } });
  if (route.agentId) await prisma.leadEvent.create({ data: { leadId: lead.id, type: "routed", detail: route.note, agentId: route.agentId } });

  // Confirm to the consumer + notify the brokerage (no-op if SMTP isn't configured).
  const listingTitle = `${listing.canonicalProperty.address}, ${listing.neighbourhood.name}`;
  const notify = leadNotifyEmail({ name, email, phone: body.phone ?? null, message: lead.message, type: "buyer", listingTitle, sourcePage: body.sourcePage ?? "listing viewing" });
  const confirm = leadConfirmationEmail(name, { listingTitle, viewing: true });
  await Promise.allSettled([
    sendMail({ to: LEADS_NOTIFY, subject: notify.subject, html: notify.html, replyTo: email }),
    sendMail({ to: email, subject: confirm.subject, html: confirm.html }),
  ]);

  return NextResponse.json({ ok: true });
}
