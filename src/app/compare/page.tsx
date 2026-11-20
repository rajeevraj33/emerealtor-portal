"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice, formatRent, bedLabel } from "@/lib/format";

const KEY = "eme_compare";
type Row = {
  id: string; address: string; neighbourhood: string; cover: string; price: number | null; mode: string; status: string;
  beds: number; bedsPlus: number; baths: number; parking: number; sqftMin: number; sqftMax: number; propertyType: string;
  maintenanceFee: number | null; taxesAnnual: number | null; daysOnMarket: number;
};

export default function ComparePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const ids: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const res = await fetch(`/api/compare?ids=${ids.join(",")}`);
    const data = await res.json();
    setRows(data.listings); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function remove(id: string) {
    const ids: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    localStorage.setItem(KEY, JSON.stringify(ids.filter((x) => x !== id)));
    window.dispatchEvent(new Event("compare-change"));
    load();
  }
  function clearAll() {
    localStorage.setItem(KEY, "[]");
    window.dispatchEvent(new Event("compare-change"));
    setRows([]);
  }

  const priceStr = (r: Row) => r.price == null ? "🔒 Sign up" : r.mode === "Rent" ? formatRent(r.price) : formatPrice(r.price);

  const attrs: [string, (r: Row) => string][] = [
    ["Price", priceStr],
    ["Status", (r) => r.status],
    ["Type", (r) => r.propertyType],
    ["Beds", (r) => bedLabel(r.beds, r.bedsPlus)],
    ["Baths", (r) => String(r.baths)],
    ["Parking", (r) => String(r.parking)],
    ["Size (sqft)", (r) => `${r.sqftMin.toLocaleString()}–${r.sqftMax.toLocaleString()}`],
    ["Maintenance", (r) => (r.maintenanceFee ? `${formatPrice(r.maintenanceFee)}/mo` : "—")],
    ["Property tax", (r) => (r.taxesAnnual ? `${formatPrice(r.taxesAnnual)}/yr` : "—")],
    ["Days on market", (r) => String(r.daysOnMarket)],
    ["Neighbourhood", (r) => r.neighbourhood],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Compare Listings</h1>
        {rows.length > 0 && <button onClick={clearAll} className="text-sm text-gray-400 hover:text-accent">Clear all</button>}
      </div>

      {loading ? <p className="text-gray-500">Loading…</p> : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <p className="font-medium text-gray-700">Nothing to compare yet.</p>
          <p className="mt-1 text-sm">Tap <strong>⇄ Compare</strong> on listings (up to 4) to line them up side by side.</p>
          <Link href="/search" className="mt-4 inline-block rounded-full bg-accent text-white px-5 py-2 text-sm">Browse listings</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[640px]">
            <thead>
              <tr>
                <th className="w-32"></th>
                {rows.map((r) => (
                  <th key={r.id} className="p-2 align-top text-left">
                    <Link href={`/listing/${r.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.cover} alt="" className="w-full h-24 object-cover rounded-lg mb-1" />
                      <div className="font-semibold text-gray-900 leading-tight">{priceStr(r)}</div>
                      <div className="text-xs text-gray-600 truncate">{r.address}</div>
                    </Link>
                    <button onClick={() => remove(r.id)} className="mt-1 text-xs text-gray-400 hover:text-accent">✕ Remove</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrs.map(([label, fn], i) => (
                <tr key={label} className={i % 2 ? "bg-gray-50" : ""}>
                  <td className="p-2 font-medium text-gray-500">{label}</td>
                  {rows.map((r) => <td key={r.id} className="p-2 text-gray-800">{fn(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
