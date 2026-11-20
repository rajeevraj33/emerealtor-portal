import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listingCardInclude } from "@/lib/queries";
import { getCurrentUser, canViewVow } from "@/lib/session";
import { getCities } from "@/lib/cities";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import HomeMarketSnapshot from "@/components/HomeMarketSnapshot";
import HomeContact from "@/components/HomeContact";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const vow = canViewVow(user);

  const [activeCount, soldAgg, featured, cities, favIds] = await Promise.all([
    prisma.listing.count({ where: { status: "Active" } }),
    prisma.marketStat.aggregate({ _sum: { salesCount: true } }),
    prisma.listing.findMany({ where: { isFeatured: true, status: "Active" }, include: listingCardInclude, take: 8, orderBy: { listedAt: "desc" } }),
    getCities(),
    user ? prisma.favourite.findMany({ where: { userId: user.id }, select: { listingId: true } }) : Promise.resolve([]),
  ]);
  const favSet = new Set(favIds.map((f) => f.listingId));
  // "Active & Sold" = active listings + all historical sales across the GTA
  const total = (activeCount + (soldAgg._sum.salesCount ?? 0)).toLocaleString();

  return (
    <div>
      {/* Hero */}
      <section className="relative text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home.jpeg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight drop-shadow-lg">Search {total} Active &amp; Sold Listings</h1>
          <p className="mt-3 text-white/90 drop-shadow">Greater Toronto Area homes for sale and rent — with sold history, market reports, neighbourhood data and instant estimates.</p>
          <div className="mt-8"><SearchBar size="lg" /></div>
          <div className="mt-4 flex justify-center gap-2 text-sm">
            <Link href="/search?mode=Sale" className="px-4 py-2 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25">For Sale</Link>
            <Link href="/search?mode=Rent" className="px-4 py-2 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25">For Rent</Link>
            <Link href="/search?status=Sold" className="px-4 py-2 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25">Sold</Link>
            <Link href="/search?status=Rented" className="px-4 py-2 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25">Rented</Link>
          </div>
        </div>
      </section>

      {/* Showcased listings */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl font-semibold text-gray-900">Showcased GTA Listings</h2>
          <Link href="/search?mode=Sale" className="text-sm text-brand hover:underline">View all featured →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((l) => <ListingCard key={l.id} listing={l} canViewVow={vow} isFav={favSet.has(l.id)} />)}
        </div>
      </section>

      {/* Market dashboard */}
      <section className="bg-gray-50 border-y border-gray-100"><HomeMarketSnapshot /></section>

      {/* Home value CTA */}
      <section className="bg-brand-50">
        <div className="mx-auto max-w-7xl px-4 py-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">What&apos;s your home worth?</h2>
            <p className="text-gray-600 mt-1">Get an instant, AI-assisted estimate with a High / Mid / Low range and up-to-date neighbourhood sales.</p>
          </div>
          <Link href="/home-estimator" className="px-6 py-3 rounded-full bg-accent hover:bg-accent-600 text-white font-medium">Get an Estimate</Link>
        </div>
      </section>

      {/* Cities */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-5">Explore Greater Toronto Area Cities</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {cities.map((c) => (
            <Link key={c.slug} href={`/city/${c.slug}`} className="group rounded-xl p-5 bg-white ring-1 ring-black/5 hover:shadow-md transition">
              <div className="font-semibold text-gray-900 group-hover:text-brand">{c.name}</div>
              <div className="text-sm text-gray-500">{c.nbCount} neighbourhoods</div>
              <div className="mt-2 text-xs text-brand">Homes &amp; market report →</div>
            </Link>
          ))}
        </div>
        <div className="mt-4"><Link href="/neighbourhoods" className="text-sm text-brand hover:underline">All neighbourhoods →</Link></div>
      </section>

      {/* Work with Ruchi */}
      <HomeContact />
    </div>
  );
}
