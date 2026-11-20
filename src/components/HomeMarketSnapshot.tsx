import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

// property.ca-style market dashboard for the home page (featured city).
export default async function HomeMarketSnapshot({ citySlug = "mississauga", cityName = "Mississauga" }: { citySlug?: string; cityName?: string }) {
  const stats = await prisma.marketStat.findMany({ where: { citySlug }, orderBy: { month: "desc" }, take: 13 });
  if (stats.length < 2) return null;

  const recent = stats.slice(0, 3);
  const sold = recent.reduce((s, r) => s + r.salesCount, 0);
  const rented = recent.reduce((s, r) => s + r.rentCount, 0);
  // Weighted averages across all available months. The single latest month can have
  // zero rentals (which showed "$0/mo"); a windowed average reflects the real market.
  const soldNAll = stats.reduce((s, r) => s + r.salesCount, 0);
  const rentNAll = stats.reduce((s, r) => s + r.rentCount, 0);
  const avgSold = soldNAll ? Math.round(stats.reduce((s, r) => s + r.avgSoldPrice * r.salesCount, 0) / soldNAll) : stats[0].avgSoldPrice;
  const avgRent = rentNAll ? Math.round(stats.reduce((s, r) => s + r.avgRentPrice * r.rentCount, 0) / rentNAll) : 0;
  const yearAgo = stats[12] ?? stats[stats.length - 1];
  const yoy = yearAgo && yearAgo.avgSoldPrice ? ((stats[0].avgSoldPrice - yearAgo.avgSoldPrice) / yearAgo.avgSoldPrice) * 100 : 0;
  const up = yoy >= 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <h2 className="text-center text-2xl font-semibold text-gray-900">
        Sales Index for <span className="text-accent">{cityName}</span> Homes
      </h2>
      <p className="text-center text-sm text-gray-500 mt-1 mb-6">A live market snapshot, refreshed from our dataset.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl overflow-hidden ring-1 ring-black/5">
          <div className="bg-brand text-[var(--brand-fg)] text-center text-sm font-semibold py-2.5">{cityName} Homes — Average Sold Price</div>
          <div className="bg-gray-50 py-9 text-center">
            <div className="text-5xl font-bold tracking-tight text-gray-900">
              <span className="text-accent">$</span>{(avgSold / 1e6).toFixed(2)}<span className="text-accent text-3xl align-top">M</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <span className={up ? "text-accent font-medium" : "text-blue-600 font-medium"}>{up ? "↑" : "↓"} {Math.abs(yoy).toFixed(2)}%</span> year-over-year change in values
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden ring-1 ring-black/5">
          <div className="bg-brand text-[var(--brand-fg)] text-center text-sm font-semibold py-2.5">{cityName} Market Report Summary</div>
          <dl className="divide-y divide-gray-100 text-sm bg-white">
            <Row k="Average Sold Price" v={formatPrice(avgSold)} />
            <Row k="Average Rent Price" v={avgRent ? `${formatPrice(avgRent)}/mo` : "—"} />
            <Row k="Number of Transactions" v={`${sold.toLocaleString()} Sold / ${rented.toLocaleString()} Rented`} />
          </dl>
        </div>
      </div>

      <div className="mt-5 text-center">
        <Link href={`/city/${citySlug}`} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400">
          View Full {cityName} Market Report →
        </Link>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <dt className="text-gray-700">{k}</dt>
      <dd className="font-semibold text-accent">{v}</dd>
    </div>
  );
}
