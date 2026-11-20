import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Typeahead for the search bar: matches cities, neighbourhoods (areas) and active
// listings (by address or MLS#). SQLite LIKE is case-insensitive for ASCII, so
// `contains` needs no mode flag.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ cities: [], areas: [], listings: [] });

  const [cityRows, areas, listings] = await Promise.all([
    prisma.neighbourhood.findMany({
      where: { city: { contains: q } },
      select: { city: true, citySlug: true },
      distinct: ["citySlug"],
      orderBy: { city: "asc" },
      take: 4,
    }),
    prisma.neighbourhood.findMany({
      where: { name: { contains: q } },
      select: { name: true, slug: true, city: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
    prisma.listing.findMany({
      where: {
        status: "Active",
        OR: [{ canonicalProperty: { address: { contains: q } } }, { mlsNumber: { contains: q } }],
      },
      select: {
        id: true, listPrice: true, mode: true,
        canonicalProperty: { select: { address: true, city: true } },
      },
      orderBy: { listedAt: "desc" },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    cities: cityRows.map((c) => ({ name: c.city, slug: c.citySlug })),
    areas: areas.map((a) => ({ name: a.name, slug: a.slug, city: a.city })),
    listings: listings.map((l) => ({ id: l.id, address: l.canonicalProperty.address, city: l.canonicalProperty.city, price: l.listPrice, mode: l.mode })),
  });
}
