"use client";
import Link from "next/link";
import { useState } from "react";
import { formatPrice, PROPERTY_TYPES } from "@/lib/format";
import type { Estimate } from "@/lib/avm";

export default function Estimator({ neighbourhoods }: { neighbourhoods: { slug: string; name: string }[] }) {
  const [est, setEst] = useState<Estimate | null>(null);
  const [ran, setRan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState<{ address: string; neighbourhoodSlug: string; propertyType: string }>({ address: "", neighbourhoodSlug: neighbourhoods[0]?.slug ?? "", propertyType: "Detached" });
  const [leadDone, setLeadDone] = useState(false);

  async function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      address: String(fd.get("address") || ""),
      neighbourhoodSlug: String(fd.get("neighbourhood")),
      propertyType: String(fd.get("type")),
      sqft: Number(fd.get("sqft")) || 1800,
    };
    setCtx({ address: payload.address, neighbourhoodSlug: payload.neighbourhoodSlug, propertyType: payload.propertyType });
    const res = await fetch("/api/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setEst(data.estimate); setRan(true); setBusy(false);
  }

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "seller", name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"),
        message: `CMA request for ${ctx.address || ctx.neighbourhoodSlug} (${ctx.propertyType}). Estimate mid ${est ? formatPrice(est.mid) : "n/a"}.`, sourcePage: "/home-estimator" }),
    });
    setLeadDone(true);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={run} className="rounded-xl ring-1 ring-black/10 p-6 space-y-3 self-start">
        <h2 className="font-semibold text-gray-900">Tell us about your home</h2>
        <input name="address" placeholder="Street address (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2" />
        <label className="block text-sm">
          <span className="text-gray-600">Neighbourhood</span>
          <select name="neighbourhood" defaultValue={ctx.neighbourhoodSlug} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
            {neighbourhoods.map((n) => <option key={n.slug} value={n.slug}>{n.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-gray-600">Property type</span>
            <select name="type" defaultValue="Detached" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Approx. size (sqft)</span>
            <input name="sqft" type="number" defaultValue={1800} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
        </div>
        <button disabled={busy} className="w-full rounded-md bg-accent hover:bg-accent-600 text-white font-medium py-2.5 disabled:opacity-60">
          {busy ? "Calculating…" : "Get my instant estimate"}
        </button>
      </form>

      <div>
        {!ran ? (
          <div className="rounded-xl bg-brand-50 p-6 text-sm text-gray-600">
            <p>Our AI-assisted estimate uses recent comparable sales in your area to produce a <strong>High / Mid / Low</strong> range in seconds.</p>
          </div>
        ) : est ? (
          <div className="rounded-xl ring-1 ring-black/10 p-6">
            <div className="text-sm text-gray-500">✨ Estimated value <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 ml-1">{est.confidence} confidence · {est.compCount} comps</span></div>
            <div className="mt-1 text-4xl font-bold text-gray-900">{formatPrice(est.mid)}</div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Box label="Low" v={est.low} tone="bg-gray-100" />
              <Box label="Mid" v={est.mid} tone="bg-brand-50" />
              <Box label="High" v={est.high} tone="bg-gray-100" />
            </div>
            <p className="mt-3 text-xs text-gray-500"><strong>Not an appraisal.</strong> This automated estimate is for informational purposes only, is generated from comparable sales, is not guaranteed, and is not a representation by the brokerage or agent.</p>

            <div className="mt-5 border-t pt-4">
              {leadDone ? (
                <div className="rounded-lg bg-green-50 text-green-800 p-4 text-sm">✓ Thanks! An agent will prepare a free, professional Comparative Market Analysis (CMA) and reach out.</div>
              ) : (
                <form onSubmit={submitLead} className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">Want a precise, professional valuation?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="name" required placeholder="Name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                    <input name="phone" placeholder="Phone" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <button className="w-full rounded-md bg-brand hover:bg-brand-700 text-white font-medium py-2.5">Get a free professional CMA</button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl ring-1 ring-black/10 p-6 text-sm text-gray-600">
            Not enough comparable sales to estimate yet. <Link href="/search?status=Sold" className="text-brand hover:underline">Browse recent sales →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Box({ label, v, tone }: { label: string; v: number; tone: string }) {
  return <div className={`rounded-lg p-3 ${tone}`}><div className="text-xs text-gray-500">{label}</div><div className="font-semibold text-gray-900">{formatPrice(v)}</div></div>;
}
