import { CityMarket, BedRow, DomRow } from "@/lib/market";
import { formatPrice, formatPriceShort } from "@/lib/format";
import MarketChart from "./MarketChart";

export default function MarketReport({ cityName, market }: { cityName: string; market: CityMarket }) {
  const s = market.summary;
  const up = market.yoyPct >= 0;
  return (
    <section>
      <h2 className="text-center text-2xl font-semibold text-gray-900 mb-5">
        Sales Index For <span className="text-accent">{cityName}</span> Homes
      </h2>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-xl overflow-hidden ring-1 ring-black/10">
          <div className="bg-brand text-[var(--brand-fg)] text-center font-medium py-2.5 text-sm">{cityName} Homes Average Sold Price (Past Month)</div>
          <div className="p-6 text-center bg-gray-50">
            <div className="text-5xl font-bold text-accent">{formatPriceShort(s.soldPrice)}</div>
            <div className={`mt-2 text-sm font-medium ${up ? "text-green-700" : "text-accent"}`}>{up ? "↑" : "↓"} {Math.abs(market.yoyPct).toFixed(2)}% year-over-year</div>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden ring-1 ring-black/10">
          <div className="bg-brand text-[var(--brand-fg)] text-center font-medium py-2.5 text-sm">{cityName} Market Report Summary</div>
          <dl className="divide-y text-sm">
            <Row k="Average Sold Price / Size" v={`${formatPrice(s.soldPrice)} / ${s.soldSize.toLocaleString()} FT²`} />
            <Row k="Average Rent Price / Size" v={`${formatPrice(s.rentPrice)} / ${s.rentSize.toLocaleString()} FT²`} />
            <Row k="Number of Transactions" v={`${s.sold.toLocaleString()} Sold / ${s.rented.toLocaleString()} Rented`} />
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-xl ring-1 ring-black/10 p-4">
        <MarketChart series={market.series} />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <BedReport title="Active For Sale Market Report" rows={market.forSale} active={s.activeForSale} mode="sale" />
        <BedReport title="Active For Rent Market Report" rows={market.forRent} active={s.activeForRent} mode="rent" />
        <DomReport rows={market.dom} active={s.activeForSale} />
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-400">Market figures are computed from sample/seed data for this demo, not live MLS®.</p>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between px-4 py-3"><dt className="text-gray-600">{k}</dt><dd className="font-semibold text-accent text-right">{v}</dd></div>;
}

function BedReport({ title, rows, active, mode }: { title: string; rows: BedRow[]; active: number; mode: "sale" | "rent" }) {
  const fmtPrice = (n: number) => (mode === "rent" ? formatPrice(n) : formatPriceShort(n));
  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-black/10">
      <div className="bg-brand text-[var(--brand-fg)] text-center font-medium py-2.5 text-sm">{title}</div>
      <div className="divide-y text-sm">
        <Stat k={`Active MLS® Listings ${mode === "rent" ? "For Rent" : "For Sale"}`} v={`${active.toLocaleString()}`} />
        {rows.map((r) => (
          <Stat key={r.bed} k={r.bed === "All" ? "Avg Asking Price / Size / PSF" : `Avg ${r.bed} Bed Asking Price / Size / PSF`}
            v={`${fmtPrice(r.price)} / ${r.size.toLocaleString()} FT² / $${r.psf}`} />
        ))}
      </div>
    </div>
  );
}

function DomReport({ rows, active }: { rows: DomRow[]; active: number }) {
  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-black/10">
      <div className="bg-brand text-[var(--brand-fg)] text-center font-medium py-2.5 text-sm">Average Days On Market</div>
      <div className="divide-y text-sm">
        <Stat k="Active Listings: For Sale" v={`${active.toLocaleString()}`} />
        {rows.map((r) => <Stat key={r.bed} k={`${r.bed} Bed: For Sale / For Rent`} v={`${r.sale} days / ${r.rent} days`} />)}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="px-4 py-2.5"><div className="text-gray-700">{k}</div><div className="text-accent font-semibold">{v}</div></div>;
}
