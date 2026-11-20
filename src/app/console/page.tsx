import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatPrice, timeAgo } from "@/lib/format";
import LeadStatus from "@/components/admin/LeadStatus";
import { ReassignControl } from "@/components/admin/LeadActions";
import RoutingConfig from "@/components/admin/RoutingConfig";
import CrmReports from "@/components/admin/CrmReports";
import AddAgentForm from "@/components/admin/AddAgentForm";

export const metadata: Metadata = { title: "Brokerage Console" };
export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/console");
  if (user.role === "platform_admin") redirect("/platform");
  if (user.role === "agent" || user.role === "team_lead") redirect("/agent");
  if (user.role !== "brokerage_admin") redirect("/account");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  const brokerage = await prisma.brokerage.findFirst({ where: { tenantId: user.tenantId }, include: { teams: true } });
  const [agents, leads, statusCounts, agentCounts, subscription, domains, unclaimed, reportLeads] = await Promise.all([
    prisma.agent.findMany({ where: { tenantId: user.tenantId }, include: { team: true } }),
    prisma.lead.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" }, take: 40, include: { listing: { include: { canonicalProperty: true } }, assignedAgent: true } }),
    prisma.lead.groupBy({ by: ["status"], where: { tenantId: user.tenantId }, _count: true }),
    prisma.lead.groupBy({ by: ["assignedAgentId"], where: { tenantId: user.tenantId }, _count: true }),
    prisma.subscription.findUnique({ where: { tenantId: user.tenantId } }),
    prisma.domain.findMany({ where: { tenantId: user.tenantId } }),
    prisma.lead.count({ where: { tenantId: user.tenantId, assignedAgentId: null } }),
    prisma.lead.findMany({ where: { tenantId: user.tenantId }, select: { status: true, sourcePage: true, createdAt: true, type: true, assignedAgentId: true } }),
  ]);
  const cnt = (s: string) => statusCounts.find((c) => c.status === s)?._count ?? 0;
  const agentLeadCount = (id: string) => agentCounts.find((a) => a.assignedAgentId === id)?._count ?? 0;
  const agentOptions = agents.map((a) => ({ id: a.id, name: a.name }));
  const totalLeads = leads.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant?.name} · Brokerage Console</h1>
          <p className="text-sm text-gray-500">{brokerage?.legalName} · Broker of Record {brokerage?.brokerOfRecord} · RECO {brokerage?.recoId}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/console/billing" className="text-brand hover:underline">Billing</Link>
          <Link href="/console/domains" className="text-brand hover:underline">Domains</Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Stat label="Total leads" value={totalLeads} />
        <Stat label="Unclaimed" value={unclaimed} accent={unclaimed > 0} />
        <Stat label="New" value={cnt("new")} />
        <Stat label="Contacted" value={cnt("contacted")} />
        <Stat label="Qualified" value={cnt("qualified")} />
        <Stat label="Agents" value={agents.length} />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">Brokerage performance</h2>
      <CrmReports leads={reportLeads} agents={agentOptions} />

      <div className="mt-8 grid lg:grid-cols-3 gap-8">
        {/* Routing */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Lead routing</h2>
          <RoutingConfig current={brokerage?.routingStrategy ?? "round-robin"} />
        </section>

        {/* Teams & agents */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Teams &amp; agents</h2>
          </div>
          <div className="mb-3"><AddAgentForm /></div>
          <div className="rounded-xl ring-1 ring-black/10 divide-y text-sm">
            {agents.map((a) => (
              <div key={a.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.photoUrl ?? ""} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <div className="font-medium text-gray-900">{a.name} {a.isTeamLead && <span className="text-[10px] bg-brand text-[var(--brand-fg)] rounded px-1 ml-1">Team Lead</span>}</div>
                    <div className="text-xs text-gray-500">{a.team?.name ?? "—"} · region {a.region ?? "—"} · {a.recoVerified ? "RECO ✓" : "unverified"}</div>
                  </div>
                </div>
                <div className="text-right"><div className="font-semibold text-gray-900">{agentLeadCount(a.id)}</div><div className="text-xs text-gray-400">leads</div></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Subscription + domains summary */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl ring-1 ring-black/10 p-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Subscription</h3><Link href="/console/billing" className="text-xs text-brand hover:underline">Manage →</Link></div>
          <div className="mt-2 text-sm text-gray-600 capitalize">{subscription?.plan} plan · {subscription?.seats} seats · {formatPrice((subscription?.pricePerSeat ?? 0) * (subscription?.seats ?? 0))}/mo + tax · <span className="capitalize">{subscription?.status}</span></div>
        </div>
        <div className="rounded-xl ring-1 ring-black/10 p-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Domains</h3><Link href="/console/domains" className="text-xs text-brand hover:underline">Manage →</Link></div>
          <div className="mt-2 text-sm text-gray-600">{domains.map((d) => <div key={d.id}>{d.host} · SSL {d.sslStatus}{d.isPrimary ? " · primary" : ""}</div>)}</div>
        </div>
      </div>

      {/* Leads */}
      <h2 className="mt-8 mb-2 text-lg font-semibold text-gray-900">All leads</h2>
      <div className="overflow-x-auto rounded-xl ring-1 ring-black/10">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-gray-50 text-gray-500 text-left"><tr><th className="p-3">Contact</th><th className="p-3">Type</th><th className="p-3">Listing</th><th className="p-3">Assigned</th><th className="p-3">Source</th><th className="p-3">When</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y">
            {leads.map((l) => (
              <tr key={l.id}>
                <td className="p-3"><div className="font-medium text-gray-900">{l.name}</div><div className="text-xs text-gray-500">{l.email}</div></td>
                <td className="p-3 capitalize">{l.type}</td>
                <td className="p-3">{l.listing ? <Link href={`/listing/${l.listing.id}`} className="text-brand hover:underline">{l.listing.canonicalProperty.address}</Link> : "—"}</td>
                <td className="p-3"><ReassignControl leadId={l.id} agents={agentOptions} current={l.assignedAgentId} /></td>
                <td className="p-3 text-gray-500">{l.sourcePage ?? "—"}</td>
                <td className="p-3 text-gray-500">{timeAgo(l.createdAt)}</td>
                <td className="p-3"><LeadStatus id={l.id} initial={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-xl ring-1 p-4 ${accent ? "ring-accent/40 bg-accent/5" : "ring-black/5 bg-white"}`}><div className={`text-2xl font-bold ${accent ? "text-accent" : "text-gray-900"}`}>{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
