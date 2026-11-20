import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listingCardInclude } from "@/lib/queries";
import { getCurrentUser, canViewVow } from "@/lib/session";

export async function GET(req: NextRequest) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
  if (!ids.length) return NextResponse.json({ listings: [] });
  const vow = canViewVow(await getCurrentUser());

  const rows = await prisma.listing.findMany({ where: { id: { in: ids } }, include: listingCardInclude });
  // preserve requested order
  const byId = new Map(rows.map((r) => [r.id, r]));
  const listings = ids.map((id) => byId.get(id)).filter(Boolean).map((l) => {
    const r = l!;
    const sold = r.status === "Sold";
    return {
      id: r.id,
      address: `${r.canonicalProperty.unit ? r.canonicalProperty.unit + " - " : ""}${r.canonicalProperty.address}`,
      neighbourhood: r.neighbourhood.name,
      cover: r.media[0]?.url ?? "",
      price: sold && !vow ? null : (sold ? r.soldPrice : r.listPrice),
      mode: r.mode, status: r.status,
      beds: r.beds, bedsPlus: r.bedsPlus, baths: r.baths, parking: r.parking,
      sqftMin: r.sqftMin, sqftMax: r.sqftMax, propertyType: r.propertyType,
      maintenanceFee: r.maintenanceFee, taxesAnnual: r.taxesAnnual, daysOnMarket: r.daysOnMarket,
    };
  });
  return NextResponse.json({ listings });
}
