import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const STATUSES = ["new", "contacted", "qualified", "closed"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { leadId, action, status, agentId } = await req.json().catch(() => ({}));
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isPlatform = user.role === "platform_admin";
  const isAdmin = user.role === "brokerage_admin" || user.role === "team_lead";
  if (!isPlatform && lead.tenantId !== user.tenantId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const myAgent = await prisma.agent.findFirst({ where: { userId: user.id } });

  if (action === "claim") {
    if (lead.assignedAgentId) return NextResponse.json({ error: "already_claimed" }, { status: 409 });
    const claimAgentId = myAgent?.id ?? agentId;
    if (!claimAgentId) return NextResponse.json({ error: "no agent" }, { status: 400 });
    await prisma.lead.update({ where: { id: leadId }, data: { assignedAgentId: claimAgentId, claimedAt: new Date(), slaDueAt: null, status: lead.status === "new" ? "contacted" : lead.status } });
    await prisma.leadEvent.create({ data: { leadId, type: "claimed", detail: "Claimed from queue", agentId: claimAgentId } });
    return NextResponse.json({ ok: true });
  }

  if (action === "status") {
    if (!STATUSES.includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    const ownsLead = myAgent && lead.assignedAgentId === myAgent.id;
    if (!isPlatform && !isAdmin && !ownsLead) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    await prisma.lead.update({ where: { id: leadId }, data: { status } });
    await prisma.leadEvent.create({ data: { leadId, type: "status", detail: `Status → ${status}`, agentId: myAgent?.id ?? null } });
    return NextResponse.json({ ok: true });
  }

  if (action === "reassign") {
    if (!isPlatform && !isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
    await prisma.lead.update({ where: { id: leadId }, data: { assignedAgentId: agentId, claimedAt: new Date(), slaDueAt: null } });
    await prisma.leadEvent.create({ data: { leadId, type: "reassigned", detail: "Manually reassigned", agentId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
