import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listingCardInclude } from "@/lib/queries";
import { getCities } from "@/lib/cities";
import { getCityMarket } from "@/lib/market";
import { getCurrentUser, canViewVow } from "@/lib/session";
import ListingCard from "@/components/ListingCard";
import MarketReport from "@/components/market/MarketReport";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const city = (await getCities()).find((c) => c.slug === slug);
  if (!city) return { title: "City not found" };
  return { title: `${city.name} Real Estate — Homes for Sale & Market Report`, description: `Search ${city.name} homes for sale and rent, explore neighbourhoods, sold prices and the ${city.name} housing market report.` };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const vow = canViewVow(user);
  const city = (await getCities()).find((c) => c.slug === slug);
  if (!city) notFound();

  const [market, hoods, listings, favRows] = await Promise.all([
    getCityMarket(slug),
    prisma.neighbourhood.findMany({ where: { citySlug: slug }, include: { _count: { select: { listings: { where: { status: "Active" } } } } }, orderBy: { name: "asc" } }),
    prisma.listing.findMany({ where: { status: "Active", neighbourhood: { citySlug: slug }, mode: "Sale" }, include: listingCardInclude, take: 8, orderBy: { listedAt: "desc" } }),
    user ? prisma.favourite.findMany({ where: { userId: user.id }, select: { listingId: true } }) : Promise.resolve([]),
  ]);
  const favSet = new Set(favRows.map((f) => f.listingId));
  const totalActive = market.summary.activeForSale + market.summary.activeForRent;

  return (
    <div>
      <div className="bg-brand text-[var(--brand-fg)]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <nav className="text-sm text-[var(--brand-fg-soft)] mb-2"><Link href="/" className="hover:text-[var(--brand-fg)]">Home</Link> / {city.name}</nav>
          <h1 className="text-3xl font-bold">{city.name} Real Estate</h1>
          <p className="mt-2 text-[var(--brand-fg-soft)]">Homes for sale and rent across {city.nbCount} {city.name} neighbourhoods. Explore the market, browse listings and find your area.</p>
          <div className="mt-4 flex gap-2 text-sm">
            <Link href={`/search?city=${slug}&mode=Sale`} className="px-4 py-2 rounded-full bg-accent hover:bg-accent-600 font-medium">View all {city.name} listings</Link>
            <Link href={`/search?city=${slug}&status=Sold`} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20">Recently sold</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 space-y-12">
        {/* Areas */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Areas in {city.name}</h2>
          <div className="flex flex-wrap gap-2">
            {hoods.map((n) => (
              <Link key={n.id} href={`/search?city=${slug}&neighbourhood=${n.slug}`} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-brand hover:text-brand">
                {n.name} <span className="text-gray-400">· {n._count.listings}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Market report */}
        <MarketReport cityName={city.name} market={market} />

        {/* Showcased listings */}
        {listings.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Homes for sale in {city.name}</h2>
              <Link href={`/search?city=${slug}&mode=Sale`} className="text-sm text-brand hover:underline">View all {totalActive.toLocaleString()} listings →</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {listings.map((l) => <ListingCard key={l.id} listing={l} canViewVow={vow} isFav={favSet.has(l.id)} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
