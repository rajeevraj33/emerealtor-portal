import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { listingCardInclude } from "@/lib/queries";
import { getCurrentUser, canViewVow } from "@/lib/session";
import { SearchParams, str, num, parsePolygon, pointInPolygon, orderByFor } from "@/lib/search";
import { getCities } from "@/lib/cities";
import ListingCard from "@/components/ListingCard";
import FilterBar from "@/components/search/FilterBar";
import SearchLayout from "@/components/search/SearchLayout";
import SaveSearchButton from "@/components/search/SaveSearchButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const p = await searchParams;
  const mode = str(p, "mode") ?? "Sale";
  const sold = str(p, "status") === "Sold";
  const rented = str(p, "status") === "Rented";
  const what = sold ? "Sold Listings" : rented ? "Rented Listings" : mode === "Rent" ? "Homes for Rent" : "Homes for Sale";
  return { title: `GTA ${what}` };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const p = await searchParams;
  const user = await getCurrentUser();
  const vow = canViewVow(user);

  const mode = str(p, "mode") === "Rent" ? "Rent" : "Sale";
  const soldMode = str(p, "status") === "Sold";
  const rentedMode = str(p, "status") === "Rented";
  const minPrice = num(p, "minPrice");
  const maxPrice = num(p, "maxPrice");
  const minBeds = num(p, "beds");
  const minBaths = num(p, "baths");
  const types = (str(p, "type") ?? "").split(",").filter(Boolean);
  const nbSlug = str(p, "neighbourhood");
  const location = str(p, "location");
  const sort = str(p, "sort");
  const polygon = parsePolygon(str(p, "poly"));

  const [cities, neighbourhoods] = await Promise.all([getCities(), prisma.neighbourhood.findMany({ orderBy: { name: "asc" } })]);

  let citySlug = str(p, "city");
  let nbId: string | undefined = nbSlug ? neighbourhoods.find((n) => n.slug === nbSlug)?.id : undefined;

  const where: Prisma.ListingWhereInput = {};
  if (soldMode) where.status = "Sold";
  else if (rentedMode) { where.status = "Rented"; where.mode = "Rent"; }
  else { where.status = "Active"; where.mode = mode; }
  if (minPrice) where.listPrice = { ...(where.listPrice as object), gte: minPrice };
  if (maxPrice) where.listPrice = { ...(where.listPrice as object), lte: maxPrice };
  if (minBeds) where.beds = { gte: minBeds };
  if (minBaths) where.baths = { gte: minBaths };
  if (types.length) where.propertyType = { in: types };

  // resolve free-text: city → neighbourhood → MLS# → address
  if (location && !citySlug && !nbId) {
    const loc = location.toLowerCase().trim();
    const city = cities.find((c) => c.name.toLowerCase() === loc || c.name.toLowerCase().includes(loc) || loc.includes(c.name.toLowerCase()));
    if (city) citySlug = city.slug;
    else {
      const nb = neighbourhoods.find((n) => n.name.toLowerCase().includes(loc) || loc.includes(n.name.toLowerCase()));
      if (nb) { nbId = nb.id; citySlug = nb.citySlug; }
      else if (/^[wcerns]\d{5,}$/i.test(location.trim())) where.mlsNumber = location.trim().toUpperCase();
      else where.canonicalProperty = { address: { contains: location } };
    }
  }
  const activeNb = nbId ? neighbourhoods.find((n) => n.id === nbId) : undefined;
  if (activeNb) citySlug = activeNb.citySlug;
  if (nbId) where.neighbourhoodId = nbId;
  else if (citySlug) where.neighbourhood = { citySlug };

  let listings = await prisma.listing.findMany({ where, include: listingCardInclude, orderBy: orderByFor(sort), take: 400 });
  if (polygon) listings = listings.filter((l) => pointInPolygon({ lat: l.canonicalProperty.lat, lng: l.canonicalProperty.lng }, polygon));

  const favIds = user ? new Set((await prisma.favourite.findMany({ where: { userId: user.id }, select: { listingId: true } })).map((f) => f.listingId)) : new Set<string>();

  const markers = listings.map((l) => ({
    id: l.id, lat: l.canonicalProperty.lat, lng: l.canonicalProperty.lng,
    price: (soldMode || rentedMode) && !vow ? null : l.listPrice, isRent: l.mode === "Rent", sold: l.status === "Sold" || l.status === "Rented",
    address: `${l.canonicalProperty.unit ? l.canonicalProperty.unit + " - " : ""}${l.canonicalProperty.address}`,
    beds: l.beds, baths: l.baths, cover: l.media[0]?.url ?? "",
  }));

  const activeCity = citySlug ? cities.find((c) => c.slug === citySlug) : undefined;
  const cityNbs = citySlug ? neighbourhoods.filter((n) => n.citySlug === citySlug) : [];
  const place = activeNb ? `${activeNb.name}, ${activeNb.city}` : activeCity ? activeCity.name : "GTA";
  const what = soldMode ? "Recently Sold" : rentedMode ? "Recently Rented" : mode === "Rent" ? "Homes For Rent" : "Homes For Sale";
  const center = activeNb ? { lat: activeNb.lat, lng: activeNb.lng } : activeCity ? { lat: activeCity.lat, lng: activeCity.lng } : { lat: 43.72, lng: -79.42 };

  const cards = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((l) => <ListingCard key={l.id} listing={l} canViewVow={vow} isFav={favIds.has(l.id)} />)}
    </div>
  );

  return (
    <div>
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-5">
          <h1 className="text-xl font-semibold text-gray-900">{place} {what}</h1>
          <p className="text-sm text-gray-500 mb-3">
            Browse the latest {place} MLS® listings by price, bedrooms or property type.
            {activeCity && !activeNb && <> · <Link href={`/city/${activeCity.slug}`} className="text-brand hover:underline">{activeCity.name} market report &amp; areas →</Link></>}
          </p>
        </div>
        <FilterBar params={p} cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} neighbourhoods={cityNbs.map((n) => ({ slug: n.slug, name: n.name }))} activeCity={citySlug} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{listings.length} Listing{listings.length === 1 ? "" : "s"}</span>
            {polygon && <span className="text-xs bg-brand-50 text-brand px-2 py-1 rounded">📍 Map area applied</span>}
            <SaveSearchButton params={p} count={listings.length} />
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="font-medium text-gray-700">Currently no listings match your search.</p>
            <p className="mt-1 text-sm">Try changing your area selection or expanding the price range.</p>
          </div>
        ) : (
          <SearchLayout markers={markers} center={center} params={p}>{cards}</SearchLayout>
        )}
      </div>
    </div>
  );
}
