import { prisma } from "./prisma";

const sqftMid = (a: number, b: number) => Math.round((a + b) / 2);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

export type BedRow = { bed: string; count: number; price: number; size: number; psf: number };
export type DomRow = { bed: string; sale: number; rent: number };

export type CityMarket = {
  citySlug: string;
  series: { month: Date; avgSoldPrice: number; salesCount: number }[];
  lastSold: number;
  yoyPct: number;
  summary: { soldPrice: number; soldSize: number; rentPrice: number; rentSize: number; sold: number; rented: number; activeForSale: number; activeForRent: number; activeCondo: number };
  forSale: BedRow[];
  forRent: BedRow[];
  dom: DomRow[];
};

function bucket(beds: number): string {
  if (beds >= 5) return "5+";
  if (beds <= 2) return "2";
  return String(beds);
}
const BEDS = ["2", "3", "4", "5+"];

function bedReport(rows: { beds: number; listPrice: number; sqftMin: number; sqftMax: number }[]): BedRow[] {
  const out: BedRow[] = [];
  for (const b of BEDS) {
    const r = rows.filter((x) => bucket(x.beds) === b);
    if (!r.length) continue;
    const price = avg(r.map((x) => x.listPrice));
    const size = avg(r.map((x) => sqftMid(x.sqftMin, x.sqftMax)));
    out.push({ bed: b, count: r.length, price, size, psf: size ? Math.round((price / size) * 100) / 100 : 0 });
  }
  // overall row
  if (rows.length) {
    const price = avg(rows.map((x) => x.listPrice));
    const size = avg(rows.map((x) => sqftMid(x.sqftMin, x.sqftMax)));
    out.push({ bed: "All", count: rows.length, price, size, psf: size ? Math.round((price / size) * 100) / 100 : 0 });
  }
  return out;
}

export async function getCityMarket(citySlug: string): Promise<CityMarket> {
  const [stats, active] = await Promise.all([
    prisma.marketStat.findMany({ where: { citySlug }, orderBy: { month: "asc" } }),
    prisma.listing.findMany({ where: { status: "Active", neighbourhood: { citySlug } }, select: { mode: true, beds: true, listPrice: true, sqftMin: true, sqftMax: true, daysOnMarket: true, propertyType: true } }),
  ]);

  const series = stats.map((s) => ({ month: s.month, avgSoldPrice: s.avgSoldPrice, salesCount: s.salesCount }));
  const last = stats[stats.length - 1];
  const prev = stats[stats.length - 13] ?? stats[0];
  const yoyPct = prev && prev.avgSoldPrice ? ((last.avgSoldPrice - prev.avgSoldPrice) / prev.avgSoldPrice) * 100 : 0;

  const sale = active.filter((a) => a.mode === "Sale");
  const rent = active.filter((a) => a.mode === "Rent");

  const dom: DomRow[] = BEDS.map((b) => ({
    bed: b,
    sale: avg(sale.filter((x) => bucket(x.beds) === b).map((x) => x.daysOnMarket)),
    rent: avg(rent.filter((x) => bucket(x.beds) === b).map((x) => x.daysOnMarket)),
  })).filter((d) => d.sale || d.rent);

  return {
    citySlug, series, lastSold: last?.avgSoldPrice ?? 0, yoyPct,
    summary: {
      soldPrice: last?.avgSoldPrice ?? 0,
      soldSize: avg(sale.map((x) => sqftMid(x.sqftMin, x.sqftMax))),
      rentPrice: last?.avgRentPrice ?? 0,
      rentSize: avg(rent.map((x) => sqftMid(x.sqftMin, x.sqftMax))),
      sold: last?.salesCount ?? 0,
      rented: last?.rentCount ?? 0,
      activeForSale: sale.length,
      activeForRent: rent.length,
      activeCondo: active.filter((a) => a.propertyType.includes("Condo")).length,
    },
    forSale: bedReport(sale),
    forRent: bedReport(rent),
    dom,
  };
}
