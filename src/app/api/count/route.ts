import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Live count of active listings matching the assistant's criteria.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode") === "Rent" ? "Rent" : "Sale";
  const where: Prisma.ListingWhereInput = { status: "Active", mode };
  const city = sp.get("city");
  const area = sp.get("neighbourhood");
  const beds = Number(sp.get("beds") || 0);
  const maxPrice = Number(sp.get("maxPrice") || 0);
  if (area) where.neighbourhood = { slug: area };
  else if (city) where.neighbourhood = { citySlug: city };
  if (beds) where.beds = { gte: beds };
  if (maxPrice) where.listPrice = { lte: maxPrice };
  const count = await prisma.listing.count({ where });
  return NextResponse.json({ count });
}
