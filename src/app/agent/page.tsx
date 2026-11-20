import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { timeAgo } from "@/lib/format";
import LeadStatus from "@/components/admin/LeadStatus";
import { ClaimButton } from "@/components/admin/LeadActions";
import CrmReports from "@/components/admin/CrmReports";

export const metadata: Metadata = { title: "My Leads" };
export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/agent");
  if (user.role === "consumer") redirect("/account");
  if (user.role === "platform_admin") redirect("/platform");
  if (user.role === "brokerage_admin") redirect("/console");

  const me = await prisma.agent.findFirst({ where: { userId: user.id }, include: { brokerage: true, team: true } });
  if (!me) redirect("/account");

  const [mine, queue] = await Promise.all([
    prisma.lead.findMany({ where: { assignedAgentId: me.id }, orderBy: { createdAt: "desc" }, include: { listing: { include: { canonicalProperty: true } } } }),
    prisma.lead.findMany({ where: { tenantId: me.tenantId, assignedAgentId: null }, orderBy: { createdAt: "desc" }, include: { listing: { include: { canonicalProperty: true } } } }),
  ]);
  const byStatus = (s: string) => mine.filter((l) => l.status === s).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
          <p className="text-sm text-gray-500">{me.name} · {me.team?.name ?? "—"} · {me.brokerage.tradeName} · routing: <strong>{me.brokerage.routingStrategy}</strong></p>
        </div>
        <Link href="/account" className="text-sm text-brand hover:underline">Account</Link>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Assigned" value={mine.length} />
        <Stat label="New" value={byStatus("new")} />
        <Stat label="Contacted" value={byStatus("contacted")} />
        <Stat label="Qualified" value={byStatus("qualified")} />
        <Stat label="Closed" value={byStatus("closed")} />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">My performance</h2>
      <CrmReports leads={mine} />

      {queue.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unclaimed queue <span className="text-sm text-gray-400">(first-to-claim · SLA {2}h)</span></h2>
          <div className="rounded-xl ring-1 ring-amber-200 bg-amber-50/40 divide-y">
            {queue.map((l) => (
              <div key={l.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{l.name} <span className="text-xs text-gray-400 capitalize">· {l.type}</span></div>
                  <div className="text-xs text-gray-500">{l.message} {l.listing && <>· {l.listing.canonicalProperty.address}</>}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {l.slaDueAt && <span className="text-xs text-amber-700">SLA {timeAgo(l.createdAt)}</span>}
                  <ClaimButton leadId={l.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Assigned to me</h2>
        <div className="overflow-x-auto rounded-xl ring-1 ring-black/10">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 text-left"><tr><th className="p-3">Contact</th><th className="p-3">Type</th><th className="p-3">Listing</th><th className="p-3">Source</th><th className="p-3">When</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y">
              {mine.map((l) => (
                <tr key={l.id}>
                  <td className="p-3"><div className="font-medium text-gray-900">{l.name}</div><div className="text-xs text-gray-500">{l.email}{l.phone ? ` · ${l.phone}` : ""}</div></td>
                  <td className="p-3 capitalize">{l.type}</td>
                  <td className="p-3">{l.listing ? <Link href={`/listing/${l.listing.id}`} className="text-brand hover:underline">{l.listing.canonicalProperty.address}</Link> : "—"}</td>
                  <td className="p-3 text-gray-500">{l.sourcePage ?? "—"}</td>
                  <td className="p-3 text-gray-500">{timeAgo(l.createdAt)}</td>
                  <td className="p-3"><LeadStatus id={l.id} initial={l.status} /></td>
                </tr>
              ))}
              {mine.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No leads assigned yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl ring-1 ring-black/5 p-4 bg-white"><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
