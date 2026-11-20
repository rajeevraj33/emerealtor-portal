import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mississauga Neighbourhoods",
  description: "Explore Mississauga neighbourhoods — homes for sale, market stats, schools, demographics and walk/transit scores.",
};
export const dynamic = "force-dynamic";

export default async function NeighbourhoodsIndex() {
  const nbs = await prisma.neighbourhood.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { listings: { where: { status: "Active" } } } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Mississauga Neighbourhoods</h1>
      <p className="mt-2 text-gray-600">Discover the right community — browse active listings, schools, demographics and lifestyle scores.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nbs.map((n) => (
          <Link key={n.id} href={`/neighbourhood/${n.slug}`} className="group rounded-xl ring-1 ring-black/5 p-5 hover:shadow-md transition bg-white">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 group-hover:text-brand">{n.name}</h2>
              <span className="text-sm text-brand">{n._count.listings} active →</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{n.about}</p>
            <div className="mt-3 flex gap-3 text-xs text-gray-500">
              <span>Walk {n.walkScore}</span><span>Transit {n.transitScore}</span><span>Pop {(n.population / 1000).toFixed(0)}k</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
