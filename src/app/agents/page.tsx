import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Our Agents" };
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const tenant = await getActiveTenant();
  const [agents, brokerage] = await Promise.all([
    prisma.agent.findMany({ where: { tenantId: tenant.id, active: true }, include: { team: true, _count: { select: { listings: { where: { status: "Active" } } } } }, orderBy: [{ isTeamLead: "desc" }, { name: "asc" }] }),
    prisma.brokerage.findFirst({ where: { tenantId: tenant.id } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Meet the {tenant.name} team</h1>
      <p className="mt-2 text-gray-600">{brokerage?.legalName} · Broker of Record {brokerage?.brokerOfRecord}. Connect with a REALTOR® who knows your neighbourhood.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <Link key={a.id} href={`/agents/${a.id}`} className="group rounded-xl ring-1 ring-black/5 p-5 hover:shadow-md transition bg-white flex gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.photoUrl ?? ""} alt={a.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-brand">{a.name}{a.isTeamLead && <span className="ml-2 text-[10px] bg-brand text-[var(--brand-fg)] rounded px-1">Team Lead</span>}</div>
              <div className="text-xs text-gray-500">{a.title} · {a.team?.name ?? ""}</div>
              <div className="text-xs text-gray-500 mt-1">{a.region ? `${a.region} GTA` : ""} {a._count.listings > 0 && `· ${a._count.listings} active listing${a._count.listings === 1 ? "" : "s"}`}</div>
              {a.recoVerified && <div className="text-[11px] text-green-700 mt-1">RECO registered ✓</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
