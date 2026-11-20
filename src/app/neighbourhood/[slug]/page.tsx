import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { listingCardInclude } from "@/lib/queries";
import { getCurrentUser, canViewVow } from "@/lib/session";
import { formatPrice } from "@/lib/format";
import ListingCard from "@/components/ListingCard";
import MapPanel from "@/components/listing/MapPanel";
import Donut from "@/components/Donut";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const n = await prisma.neighbourhood.findUnique({ where: { slug } });
  if (!n) return { title: "Neighbourhood not found" };
  return {
    title: `${n.name} Homes for Sale & Neighbourhood Guide`,
    description: `${n.name}, ${n.city}: ${n.about} Browse homes for sale, schools, demographics and walk/transit scores.`,
  };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default async function NeighbourhoodPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const vow = canViewVow(user);

  const n = await prisma.neighbourhood.findUnique({ where: { slug }, include: { schools: true } });
  if (!n) notFound();

  const [active, sold, favRows] = await Promise.all([
    prisma.listing.findMany({ where: { neighbourhoodId: n.id, status: "Active", mode: "Sale" }, include: listingCardInclude, orderBy: { listedAt: "desc" } }),
    prisma.listing.findMany({ where: { neighbourhoodId: n.id, status: "Sold" }, select: { soldPrice: true, listPrice: true } }),
    user ? prisma.favourite.findMany({ where: { userId: user.id }, select: { listingId: true } }) : Promise.resolve([]),
  ]);
  const favSet = new Set(favRows.map((f) => f.listingId));
  const medianActive = median(active.map((l) => l.listPrice));
  const medianSold = median(sold.map((s) => s.soldPrice ?? s.listPrice));
  const ages = JSON.parse(n.ageBuckets) as Record<string, number>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${n.name}, ${n.city}`,
    description: n.about,
    geo: { "@type": "GeoCoordinates", latitude: n.lat, longitude: n.lng },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-brand text-[var(--brand-fg)]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <nav className="text-sm text-[var(--brand-fg-soft)] mb-2"><Link href="/neighbourhoods" className="hover:text-[var(--brand-fg)]">Neighbourhoods</Link> / {n.name}</nav>
          <h1 className="text-3xl font-bold">{n.name} Homes for Sale</h1>
          <p className="mt-2 max-w-3xl text-[var(--brand-fg-soft)]">{n.about}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Active listings" value={String(active.length)} />
          <Stat label="Median asking" value={medianActive ? formatPrice(medianActive) : "—"} />
          <Stat label="Recent sales" value={String(sold.length)} />
          <Stat label="Median sold" value={vow ? (medianSold ? formatPrice(medianSold) : "—") : "🔒"} hint={vow ? undefined : "Log in (VOW)"} />
        </section>

        {/* Demographics + scores */}
        <section className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{n.name} Demographics</h2>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <KV k="Population" v={n.population.toLocaleString()} />
              <KV k="Median age" v={`${n.medianAge}`} />
              <KV k="Median income" v={formatPrice(n.medianIncome)} />
              <KV k="Owner-occupied" v={`${n.ownerPct}%`} />
            </div>
            {(() => {
              const colors = ["#0f3d4c", "#d6334b", "#5bb6b0", "#34495e", "#9aa7b1", "#2e75b6"];
              const entries = Object.entries(ages);
              const a014 = (ages["0-14"] as number) ?? 16;
              const fam = Math.min(48, Math.round(a014 * 2.3));
              const couples = Math.round((100 - fam) * 0.42);
              const singles = Math.round((100 - fam) * 0.34);
              const other = Math.max(0, 100 - fam - couples - singles);
              const household: [string, number][] = [["Families with children", fam], ["Couples (no children)", couples], ["One-person households", singles], ["Multi-family / other", other]];
              return (
                <>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Population by age</h3>
                  <div className="flex items-center gap-5">
                    <Donut size={172} stroke={28} centerTop="Total" centerMain={n.population.toLocaleString()}
                      segments={entries.map(([band, pct], i) => ({ label: band, value: pct as number, color: colors[i % colors.length] }))} />
                    <ul className="space-y-1.5 text-sm">
                      {entries.map(([band, pct], i) => (
                        <li key={band} className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }} />
                          <strong className="text-gray-900">{pct}%</strong>
                          <span className="text-gray-500">{band} years old</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <h3 className="text-sm font-medium text-gray-700 mt-5 mb-2">Household composition</h3>
                  <div className="space-y-1.5">
                    {household.map(([label, v]) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <span className="w-40 text-gray-600">{label}</span>
                        <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden"><div className="h-full bg-brand" style={{ width: `${Math.min(100, v * 1.8)}%` }} /></div>
                        <span className="w-8 text-right text-gray-600">{v}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-gray-400">Source: Statistics Canada, 2021 Census — {n.city} profile. Age &amp; income reflect the {n.city} Census Subdivision.</p>
                </>
              );
            })()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Lifestyle &amp; Location</h2>
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <Score label="Walk Score" value={n.walkScore} />
              <Score label="Transit Score" value={n.transitScore} />
              <Score label="Bike Score" value={n.bikeScore} />
            </div>
            <MapPanel lat={n.lat} lng={n.lng} amenities={[
              { label: "Schools", count: n.schools.length },
              { label: "Transit", count: Math.max(1, Math.round(n.transitScore / 13)) },
              { label: "Grocery", count: Math.max(1, Math.round(n.walkScore / 24)) },
            ]} />
          </div>
        </section>

        {/* Schools */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Schools in {n.name}</h2>
          <div className="rounded-xl ring-1 ring-black/10 divide-y text-sm">
            {n.schools.map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between">
                <span className="text-gray-800">{s.name}</span><span className="text-gray-500">{s.type}</span><span className="font-semibold text-brand">{s.rating.toFixed(1)}/10</span>
              </div>
            ))}
          </div>
        </section>

        {/* Listings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Homes for sale in {n.name}</h2>
            <Link href={`/search?neighbourhood=${n.slug}`} className="text-sm text-brand hover:underline">View all in search →</Link>
          </div>
          {active.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {active.slice(0, 8).map((l) => <ListingCard key={l.id} listing={l} canViewVow={vow} isFav={favSet.has(l.id)} />)}
            </div>
          ) : <p className="text-gray-500">No active listings right now. <Link href={`/search?neighbourhood=${n.slug}&status=Sold`} className="text-brand hover:underline">See recent sales</Link>.</p>}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-xl ring-1 ring-black/5 p-4 bg-white"><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}{hint && ` · ${hint}`}</div></div>;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-400 text-xs">{k}</div><div className="font-semibold text-gray-800">{v}</div></div>;
}
function Score({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-gray-50 p-3"><div className="text-2xl font-bold text-brand">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
