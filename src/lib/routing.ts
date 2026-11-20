import { prisma } from "./prisma";

export type RouteResult = { agentId: string | null; strategy: string; note: string };

/**
 * Lead routing engine (PRD §3.6). Strategies configured per brokerage (team override TODO):
 *  - round-robin: cycle through active agents using the brokerage cursor.
 *  - geographic: prefer agents whose region matches the lead, then round-robin within.
 *  - first-to-claim: leave unassigned with an SLA; agents claim from the queue.
 */
export async function routeLead(tenantId: string, region?: string | null): Promise<RouteResult> {
  const brokerage = await prisma.brokerage.findFirst({ where: { tenantId } });
  const agents = await prisma.agent.findMany({ where: { tenantId, active: true }, orderBy: { id: "asc" } });
  if (!brokerage || agents.length === 0) return { agentId: null, strategy: "none", note: "No active agents" };

  const strategy = brokerage.routingStrategy;
  if (strategy === "first-to-claim") {
    return { agentId: null, strategy, note: "Queued for first-to-claim" };
  }

  let pool = agents;
  if (strategy === "geographic" && region) {
    const inRegion = agents.filter((a) => a.region === region);
    if (inRegion.length) pool = inRegion;
  }
  const cursor = brokerage.roundRobinCursor;
  const agent = pool[cursor % pool.length];
  await prisma.brokerage.update({ where: { id: brokerage.id }, data: { roundRobinCursor: cursor + 1 } });
  return { agentId: agent.id, strategy, note: strategy === "geographic" ? `Geographic → ${agent.region}` : "Round-robin" };
}

/** Hours an unclaimed lead may sit before escalation (SLA). */
export const LEAD_SLA_HOURS = 2;
