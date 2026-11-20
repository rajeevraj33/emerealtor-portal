export type SearchParams = { [k: string]: string | string[] | undefined };

export function str(p: SearchParams, k: string): string | undefined {
  const v = p[k];
  return Array.isArray(v) ? v[0] : v;
}
export function num(p: SearchParams, k: string): number | undefined {
  const v = str(p, k);
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export type LatLng = { lat: number; lng: number };

/** Parse "lat,lng;lat,lng;..." */
export function parsePolygon(s?: string): LatLng[] | undefined {
  if (!s) return undefined;
  const pts = s.split(";").map((pair) => {
    const [lat, lng] = pair.split(",").map(Number);
    return { lat, lng };
  }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  return pts.length >= 3 ? pts : undefined;
}

export function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect = yi > pt.lat !== yj > pt.lat && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const PRICE_OPTIONS_SALE = [0, 500000, 700000, 900000, 1100000, 1300000, 1600000, 2000000, 3000000];
export const PRICE_OPTIONS_RENT = [0, 1800, 2200, 2600, 3000, 3500, 4000, 5000, 7000];

export const SORTS = [
  { key: "newest", label: "Date (Newest)" },
  { key: "price-desc", label: "Price (High to Low)" },
  { key: "price-asc", label: "Price (Low to High)" },
  { key: "beds", label: "Bedrooms" },
];

export function orderByFor(sort?: string) {
  switch (sort) {
    case "price-asc": return { listPrice: "asc" as const };
    case "price-desc": return { listPrice: "desc" as const };
    case "beds": return { beds: "desc" as const };
    default: return { listedAt: "desc" as const };
  }
}
