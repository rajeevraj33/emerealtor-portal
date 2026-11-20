import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listingFullInclude, listingCardInclude } from "@/lib/queries";
import { getCurrentUser, canViewVow } from "@/lib/session";
import { formatPrice, formatRent, bedLabel, timeAgo, sqftLabel } from "@/lib/format";
import { estimate } from "@/lib/avm";
import Gallery from "@/components/listing/Gallery";
import VowGate from "@/components/listing/VowGate";
import RequestViewing from "@/components/listing/RequestViewing";
import MortgageWidget from "@/components/listing/MortgageWidget";
import MapPanel from "@/components/listing/MapPanel";
import ShareButton from "@/components/listing/ShareButton";
import FavouriteButton from "@/components/FavouriteButton";
import CompareButton from "@/components/CompareButton";
import FeatureToggle from "@/components/listing/FeatureToggle";
import ContactAgent from "@/components/listing/ContactAgent";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await prisma.listing.findUnique({ where: { id }, include: { canonicalProperty: true, neighbourhood: true } });
  if (!l) return { title: "Listing not found" };
  return { title: `${l.canonicalProperty.address}, ${l.neighbourhood.name}` };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const vow = canViewVow(user);

  const listing = await prisma.listing.findUnique({ where: { id }, include: listingFullInclude });
  if (!listing) notFound();

  const cp = listing.canonicalProperty;
  const nb = listing.neighbourhood;
  const sold = listing.status === "Sold";
  const rented = listing.status === "Rented";
  const next = `/listing/${id}`;
  const isFav = user ? !!(await prisma.favourite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } } })) : false;
  const isStaff = !!user && ["platform_admin", "brokerage_admin", "team_lead", "agent"].includes(user.role);

  // Comparable SOLD listings (VOW) in the same neighbourhood
  const comps = await prisma.listing.findMany({
    where: { status: "Sold", neighbourhoodId: nb.id, id: { not: id } },
    include: listingCardInclude, orderBy: { soldDate: "desc" }, take: 6,
  });
  // Estimate uses neighbourhood comps, falling back to city-wide same-type sales when sparse.
  let estComps = comps;
  if (estComps.length < 3) {
    const more = await prisma.listing.findMany({
      where: { status: "Sold", propertyType: listing.propertyType, id: { not: id } },
      include: listingCardInclude, orderBy: { soldDate: "desc" }, take: 8,
    });
    const seen = new Set(comps.map((c) => c.id));
    estComps = [...comps, ...more.filter((m) => !seen.has(m.id))];
  }
  const sqftMid = Math.round((listing.sqftMin + listing.sqftMax) / 2);
  const est = estimate(sqftMid, listing.mode === "Sale" ? listing.listPrice : null,
    estComps.map((c) => ({ soldPrice: c.soldPrice ?? c.listPrice, sqftMid: Math.round((c.sqftMin + c.sqftMax) / 2), propertyType: c.propertyType })));

  const similar = await prisma.listing.findMany({
    where: { status: "Active", neighbourhoodId: nb.id, id: { not: id }, mode: listing.mode },
    include: listingCardInclude, take: 3, orderBy: { listedAt: "desc" },
  });

  const amenities = [
    { label: "Transit stops", count: Math.max(1, Math.round(nb.transitScore / 13)) },
    { label: "Schools", count: nb.schools.length },
    { label: "Grocery", count: Math.max(1, Math.round(nb.walkScore / 24)) },
    { label: "Restaurants", count: Math.max(1, Math.round(nb.walkScore / 16)) },
  ];

  const priceLabel = listing.mode === "Rent" ? formatRent(listing.listPrice) : formatPrice(listing.listPrice);
  const openHouse = listing.openHouse ? (JSON.parse(listing.openHouse) as { day: string; time: string }) : null;

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Link href="/search" className="text-sm text-brand hover:underline">← Back to search</Link>
      </div>

      {/* Gallery */}
      <div className="mx-auto max-w-7xl px-4 pt-3">
        <Gallery media={listing.media.map((m) => ({ url: m.url, isVowGated: m.isVowGated }))} canViewVow={vow} totalCount={listing.media.length} next={next} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cp.unit ? `${cp.unit} - ` : ""}{cp.address}</h1>
              <Link href={`/neighbourhood/${nb.slug}`} className="text-brand hover:underline">{nb.name}, {cp.city}</Link>
            </div>
            <div className="flex items-center gap-2">
              {isStaff && <FeatureToggle listingId={id} initial={listing.isFeatured} />}
              <FavouriteButton listingId={id} initial={isFav} />
              <CompareButton listingId={id} variant="chip" />
              <ShareButton />
            </div>
          </div>

          {/* facts */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm border-y py-3">
            <Fact icon="🛏" label={`${bedLabel(listing.beds, listing.bedsPlus)} bed`} />
            <Fact icon="🛁" label={`${listing.baths} bath`} />
            <Fact icon="🚗" label={`${listing.parking} parking`} />
            <Fact icon="📐" label={sqftLabel(listing.sqftMin, listing.sqftMax)} />
            <Fact icon="🏠" label={listing.propertyType} />
            {openHouse && <span className="text-accent font-medium">Open House {openHouse.day} {openHouse.time}</span>}
          </div>

          {/* subnav */}
          <nav className="mt-4 flex gap-4 overflow-x-auto text-sm text-gray-500 border-b pb-2" aria-label="On this page">
            {[["overview", "Overview"], ["history", "Price History"], ["estimate", "Home Value Estimate"], ["mortgage", "Mortgage"], ["neighbourhood", "Neighbourhood"], ["schools", "Schools"], ["comps", "Comparable Sales"], ["similar", "Similar"]].map(([h, l]) => (
              <a key={h} href={`#${h}`} className="shrink-0 hover:text-brand">{l}</a>
            ))}
          </nav>

          {/* Overview */}
          <Section id="overview" title="Overview &amp; Listing Details">
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <Detail k="Property Type" v={listing.propertyType} />
              <Detail k="MLS®#" v={listing.mlsNumber} />
              <Detail k="Days on Market" v={`${listing.daysOnMarket}`} />
              {listing.lotSize && <Detail k="Lot Size" v={listing.lotSize} />}
              {listing.maintenanceFee && <Detail k="Maintenance" v={`${formatPrice(listing.maintenanceFee)}/mo`} />}
              {listing.taxesAnnual && <Detail k="Property Tax" v={`${formatPrice(listing.taxesAnnual)}/yr`} />}
              <Detail k="Listed" v={timeAgo(listing.listedAt)} />
            </dl>
          </Section>

          {/* Price & status history (VOW) */}
          <Section id="history" title="Price &amp; Status History">
            {vow ? (
              <ul className="divide-y text-sm">
                {listing.priceEvents.map((e) => (
                  <li key={e.id} className="py-2 flex items-center justify-between">
                    <span className="text-gray-500">{new Date(e.date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</span>
                    <span className="font-medium text-gray-800">{e.event}</span>
                    <span className="font-semibold">{formatPrice(e.price)}</span>
                  </li>
                ))}
              </ul>
            ) : <VowGate title="See this home's price &amp; status history" next={next} />}
          </Section>

          {/* Home Value Estimate (VOW) */}
          <Section id="estimate" title="Home Value Estimate">
            {vow ? (
              est ? (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">✨ AI-assisted instant estimate <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{est.confidence} confidence · {est.compCount} comps</span></div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">{formatPrice(est.mid)}</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 max-w-md">
                    <Range label="Low" value={est.low} tone="bg-gray-100" />
                    <Range label="Mid" value={est.mid} tone="bg-brand-50" />
                    <Range label="High" value={est.high} tone="bg-gray-100" />
                  </div>
                  <p className="mt-3 text-xs text-gray-500"><strong>Not an appraisal.</strong> This automated estimate is for informational purposes only, is generated from comparable sales, and is not guaranteed or a representation by the brokerage. <Link href="/home-estimator" className="text-brand hover:underline">Get a professional CMA →</Link></p>
                </div>
              ) : <p className="text-sm text-gray-500">Not enough comparable sales nearby for an estimate yet.</p>
            ) : <VowGate title="View the instant Home Value Estimate" next={next} />}
          </Section>

          {/* Mortgage */}
          <Section id="mortgage" title="Mortgage Calculator">
            <MortgageWidget price={listing.mode === "Rent" ? listing.listPrice * 200 : (sold && listing.soldPrice ? listing.soldPrice : listing.listPrice)} />
          </Section>

          {/* Neighbourhood */}
          <Section id="neighbourhood" title={`Explore ${nb.name}`}>
            <MapPanel lat={cp.lat} lng={cp.lng} amenities={amenities} />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <Score label="Walk Score" value={nb.walkScore} />
              <Score label="Transit Score" value={nb.transitScore} />
              <Score label="Bike Score" value={nb.bikeScore} />
            </div>
            <p className="mt-3 text-sm text-gray-600">{nb.about} <Link href={`/neighbourhood/${nb.slug}`} className="text-brand hover:underline">More about {nb.name} →</Link></p>
          </Section>

          {/* Schools */}
          <Section id="schools" title="Nearby Schools">
            <ul className="divide-y text-sm">
              {nb.schools.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between">
                  <span className="text-gray-800">{s.name}</span>
                  <span className="text-gray-500">{s.type}</span>
                  <span className="font-semibold text-brand">{s.rating.toFixed(1)}/10</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Comparable sales (VOW) */}
          <Section id="comps" title="Comparable Sales">
            {vow ? (
              comps.length ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {comps.slice(0, 4).map((c) => <ListingCard key={c.id} listing={c} canViewVow={vow} />)}
                </div>
              ) : <p className="text-sm text-gray-500">No recent comparable sales found in {nb.name}.</p>
            ) : <VowGate title="See recent comparable sales in this area" next={next} />}
          </Section>

          {/* Similar */}
          {similar.length > 0 && (
            <Section id="similar" title={`Similar ${listing.mode === "Rent" ? "Rentals" : "Listings"} in ${nb.name}`}>
              <div className="grid sm:grid-cols-3 gap-4">
                {similar.map((s) => <ListingCard key={s.id} listing={s} canViewVow={vow} />)}
              </div>
            </Section>
          )}

          {/* Attribution / disclaimers (TRREB/CREA compliance) */}
          <div className="mt-8 text-[11px] text-gray-400 border-t pt-4 space-y-1">
            <p>Listing courtesy of <strong>{listing.listingBrokerageCredit}</strong>. Source board: {listing.sourceBoard} ({listing.feedType}).</p>
            <p>MLS®, REALTOR® and the associated logos are trademarks owned by the Canadian Real Estate Association (CREA). Information is deemed reliable but not guaranteed. Last updated {timeAgo(listing.createdAt)}.</p>
            <p>This is a demonstration build on seeded sample data — not live MLS® content.</p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-28 space-y-4">
            <div className="rounded-xl bg-white ring-1 ring-black/10 p-4">
              <div className="flex items-center gap-2">
                {sold && <span className="text-xs font-medium bg-brand text-[var(--brand-fg)] rounded px-2 py-0.5">Sold</span>}
                {rented && <span className="text-xs font-medium bg-brand text-[var(--brand-fg)] rounded px-2 py-0.5">Rented</span>}
                <span className="text-xs text-gray-500">{listing.mode === "Rent" ? (rented ? "" : "For Rent") : sold ? "" : "For Sale"} · {listing.daysOnMarket} days{sold || rented ? " on market" : ""}</span>
              </div>
              {sold || rented ? (
                vow ? (
                  <div className="mt-1">
                    <div className="text-3xl font-bold text-gray-900">{sold ? formatPrice(listing.soldPrice) : formatRent(listing.soldPrice ?? listing.listPrice)}</div>
                    <div className="text-sm text-gray-500">{sold ? "Sold" : "Rented"} {listing.soldDate ? timeAgo(listing.soldDate) : ""} · {sold ? `Listed ${formatPrice(listing.listPrice)}` : `Asking ${formatRent(listing.listPrice)}`}</div>
                  </div>
                ) : (
                  <div className="mt-2"><Link href={`/signup?next=${next}`} className="text-accent font-medium hover:underline">🔒 Sign up to view {sold ? "sold" : "rented"} price</Link></div>
                )
              ) : (
                <div className="mt-1 text-3xl font-bold text-gray-900">{priceLabel}</div>
              )}
              {est && vow && !sold && !rented && <div className="mt-1 text-sm text-gray-500">Instant Estimate: <span className="font-medium text-gray-700">{formatPrice(est.mid)}</span></div>}
            </div>

            {/* Agent */}
            <div className="rounded-xl bg-white ring-1 ring-black/10 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/rzp-key.jpeg" alt="Hunt property" className="h-10 w-auto mb-3" />
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.agent.photoUrl ?? ""} alt="" className="w-14 h-14 rounded-full object-cover" />
                <div>
                  <div className="font-semibold text-gray-900">{listing.agent.name}</div>
                  <div className="text-xs text-gray-500">{listing.agent.title}</div>
                  <div className="text-xs text-gray-500">{listing.agent.brokerage.tradeName ?? listing.agent.brokerage.legalName}</div>
                  {listing.agent.phone && <div className="text-sm text-brand">{listing.agent.phone}</div>}
                </div>
              </div>
              <ContactAgent listingId={id} agentId={listing.agent.id} agentName={listing.agent.name} />
            </div>

            {/* Request viewing */}
            <div className="rounded-xl bg-white ring-1 ring-black/10 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Request a viewing</h2>
              <RequestViewing listingId={id} agentName={listing.agent.name} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon, label }: { icon: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-gray-700"><span aria-hidden>{icon}</span>{label}</span>;
}
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-28">
      <h2 className="text-lg font-semibold text-gray-900 mb-3" dangerouslySetInnerHTML={{ __html: title }} />
      {children}
    </section>
  );
}
function Detail({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-gray-400">{k}</dt><dd className="font-medium text-gray-800">{v}</dd></div>;
}
function Range({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`rounded-lg p-3 ${tone}`}><div className="text-xs text-gray-500">{label}</div><div className="font-semibold text-gray-900">{formatPrice(value)}</div></div>;
}
function Score({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-gray-50 p-3"><div className="text-2xl font-bold text-brand">{value}</div><div className="text-xs text-gray-500">{label}</div></div>;
}
