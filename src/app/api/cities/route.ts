import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCities } from "@/lib/cities";

// Cities + their neighbourhoods, for the conversational search assistant.
export async function GET() {
  const [cities, nbs] = await Promise.all([
    getCities(),
    prisma.neighbourhood.findMany({ select: { name: true, slug: true, citySlug: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json(
    cities.map((c) => ({
      name: c.name,
      slug: c.slug,
      areas: nbs.filter((n) => n.citySlug === c.slug).map((n) => ({ name: n.name, slug: n.slug })),
    })),
  );
}
