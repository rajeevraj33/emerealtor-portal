import { cache } from "react";
import { prisma } from "./prisma";

export type CityInfo = { slug: string; name: string; lat: number; lng: number; nbCount: number };

export const getCities = cache(async (): Promise<CityInfo[]> => {
  const nbs = await prisma.neighbourhood.findMany({ select: { citySlug: true, city: true, lat: true, lng: true } });
  const map = new Map<string, { slug: string; name: string; lat: number; lng: number; count: number }>();
  for (const n of nbs) {
    const e = map.get(n.citySlug) ?? { slug: n.citySlug, name: n.city, lat: 0, lng: 0, count: 0 };
    e.lat += n.lat; e.lng += n.lng; e.count++;
    map.set(n.citySlug, e);
  }
  return [...map.values()]
    .map((e) => ({ slug: e.slug, name: e.name, lat: e.lat / e.count, lng: e.lng / e.count, nbCount: e.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export async function resolveCity(loc: string): Promise<CityInfo | undefined> {
  const cities = await getCities();
  const l = loc.toLowerCase().trim();
  return cities.find((c) => c.name.toLowerCase() === l || c.name.toLowerCase().includes(l) || l.includes(c.name.toLowerCase()));
}
