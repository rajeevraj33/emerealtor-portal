import Link from "next/link";
import { ListingCard as TListing } from "@/lib/queries";
import { formatPrice, formatRent, bedLabel, timeAgo } from "@/lib/format";
import FavouriteButton from "./FavouriteButton";
import CompareButton from "./CompareButton";

export default function ListingCard({ listing, canViewVow, isFav = false }: { listing: TListing; canViewVow: boolean; isFav?: boolean }) {
  const cp = listing.canonicalProperty;
  const cover = listing.media[0];
  const photoCount = listing.media.length;
  const sold = listing.status === "Sold";
  const rented = listing.status === "Rented";
  const openHouse = listing.openHouse ? (JSON.parse(listing.openHouse) as { day: string; time: string }) : null;
  const justListed = !sold && !rented && listing.daysOnMarket <= 2;
  const gatedPrice = (sold || rented) && !canViewVow;
  const addr = `${cp.unit ? cp.unit + " - " : ""}${cp.address}`;

  return (
    <Link href={`/listing/${listing.id}`} className="group block rounded-xl overflow-hidden bg-white ring-1 ring-black/5 hover:shadow-lg transition-shadow">
      <div className="relative aspect-[4/3] bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover?.url} alt={`${listing.propertyType} at ${cp.address}`} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {sold && <Badge tone="dark">Sold</Badge>}
          {rented && <Badge tone="dark">Rented</Badge>}
          {listing.isFeatured && !sold && !rented && <Badge tone="accent">★ Featured</Badge>}
          {justListed && <Badge tone="dark">Just listed</Badge>}
          {openHouse && <Badge tone="brand">Open House {openHouse.day} {openHouse.time}</Badge>}
        </div>
        <div className="absolute top-2 right-2"><FavouriteButton listingId={listing.id} initial={isFav} /></div>
        <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">📷 1/{photoCount}</span>
      </div>
      <div className="p-3">
        <div className="text-lg font-bold text-gray-900">
          {gatedPrice ? <span className="text-accent text-base">Sign up or Log in to view</span> : rented ? formatRent(listing.soldPrice ?? listing.listPrice) : listing.mode === "Rent" ? formatRent(listing.listPrice) : formatPrice(listing.listPrice)}
        </div>
        <div className="text-sm text-gray-800 truncate">{addr}</div>
        <div className="text-xs text-gray-500 mb-2">{listing.neighbourhood.name}, {cp.city}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
          <span>{bedLabel(listing.beds, listing.bedsPlus)} bed</span>
          <span>{listing.baths} bath</span>
          {listing.parking > 0 && <span>{listing.parking} parking</span>}
          <span>{listing.sqftMin.toLocaleString()}–{listing.sqftMax.toLocaleString()} sqft</span>
        </div>
        <div className="mt-2"><CompareButton listingId={listing.id} variant="chip" /></div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
          <span className="truncate">{listing.listingBrokerageCredit}</span>
          <span className="shrink-0">{sold ? `Sold ${timeAgo(listing.soldDate!)}` : rented ? `Rented ${timeAgo(listing.soldDate!)}` : timeAgo(listing.listedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "accent" | "dark" | "brand" }) {
  const cls = tone === "accent" ? "bg-accent text-white" : tone === "brand" ? "bg-brand text-[var(--brand-fg)]" : "bg-black/70 text-white";
  return <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${cls}`}>{children}</span>;
}
