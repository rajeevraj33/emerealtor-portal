import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listingCardInclude } from "@/lib/queries";
import { getCurrentUser, canViewVow } from "@/lib/session";
import ListingCard from "@/components/ListingCard";
import ContactAgent from "@/components/agents/ContactAgent";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = await prisma.agent.findUnique({ where: { id } });
  return { title: a ? `${a.name} — REALTOR®` : "Agent" };
}

export default async function AgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vow = canViewVow(await getCurrentUser());
  const agent = await prisma.agent.findUnique({ where: { id }, include: { brokerage: true, team: true } });
  if (!agent) notFound();

  const listings = await prisma.listing.findMany({ where: { agentId: id, status: "Active" }, include: listingCardInclude, take: 6, orderBy: { listedAt: "desc" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/agents" className="text-sm text-brand hover:underline">← All agents</Link>
      <div className="mt-3 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={agent.photoUrl ?? ""} alt={agent.name} className="w-24 h-24 rounded-full object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <div className="text-gray-500">{agent.title} · {agent.team?.name}</div>
              <div className="text-sm text-gray-500">{agent.brokerage.tradeName ?? agent.brokerage.legalName}</div>
              {agent.phone && <div className="text-brand">{agent.phone}</div>}
              {agent.recoVerified && <div className="text-xs text-green-700 mt-0.5">RECO registered ✓</div>}
            </div>
          </div>
          {agent.bio && <p className="mt-5 text-gray-700 leading-relaxed">{agent.bio}</p>}

          <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">Active listings</h2>
          {listings.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{listings.map((l) => <ListingCard key={l.id} listing={l} canViewVow={vow} />)}</div>
          ) : <p className="text-sm text-gray-500">No active listings right now — reach out and {agent.name.split(" ")[0]} will help you find the right home.</p>}
        </div>

        <aside>
          <div className="lg:sticky lg:top-28 rounded-xl ring-1 ring-black/10 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Contact {agent.name.split(" ")[0]}</h2>
            <ContactAgent agentId={agent.id} agentName={agent.name} />
            <p className="mt-3 text-[11px] text-gray-400">Advertised by {agent.brokerage.legalName}. RECO #{agent.brokerage.recoId}. (TRESA: brokerage identification.)</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
