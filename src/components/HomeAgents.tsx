import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveTenantId } from "@/lib/tenant";

// property.ca-style "Neighbourhood Experts" agent showcase for the home page.
export default async function HomeAgents() {
  const tenantId = await getActiveTenantId();
  const agents = await prisma.agent.findMany({ where: { tenantId }, take: 4, orderBy: [{ isTeamLead: "desc" }, { id: "asc" }] });
  if (!agents.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Neighbourhood Experts</h2>
        <span className="text-sm text-brand hidden sm:block">A better way to choose a realtor</span>
      </div>
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        {agents.map((a) => (
          <Link key={a.id} href={`/agents/${a.id}`} className="group block text-center">
            <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.photoUrl ?? `/api/photo?seed=${encodeURIComponent(a.name)}&kind=agent`} alt={a.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div className="mt-3 font-semibold uppercase text-sm tracking-wide text-gray-900 group-hover:text-accent">{a.name}</div>
            <div className="text-xs text-gray-500">{a.title ?? "Sales Representative"}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/agents" className="inline-block rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:shadow-sm">
          Show all agents
        </Link>
      </div>
    </section>
  );
}
