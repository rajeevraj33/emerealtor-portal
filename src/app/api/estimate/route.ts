import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimate } from "@/lib/avm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = body.neighbourhoodSlug as string | undefined;
  const propertyType = (body.propertyType as string) || "Detached";
  const sqft = Number(body.sqft) || 1800;

  const nb = slug ? await prisma.neighbourhood.findUnique({ where: { slug } }) : null;

  let comps = await prisma.listing.findMany({
    where: { status: "Sold", ...(nb ? { neighbourhoodId: nb.id } : {}) },
    select: { soldPrice: true, listPrice: true, sqftMin: true, sqftMax: true, propertyType: true },
    orderBy: { soldDate: "desc" }, take: 12,
  });
  // fallback to city-wide same-type sales if sparse
  if (comps.length < 3) {
    const more = await prisma.listing.findMany({
      where: { status: "Sold", propertyType },
      select: { soldPrice: true, listPrice: true, sqftMin: true, sqftMax: true, propertyType: true },
      orderBy: { soldDate: "desc" }, take: 12,
    });
    comps = [...comps, ...more];
  }

  const est = estimate(sqft, null, comps.map((c) => ({ soldPrice: c.soldPrice ?? c.listPrice, sqftMid: Math.round((c.sqftMin + c.sqftMax) / 2), propertyType: c.propertyType })));
  return NextResponse.json({ estimate: est });
}
