"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { canadianTax, PROVINCES } from "@/lib/tax";
import { formatPrice } from "@/lib/format";

export default function BillingControls({ plan, seats, province, pricePerSeat, status }: { plan: string; seats: number; province: string; pricePerSeat: number; status: string }) {
  const router = useRouter();
  const [p, setP] = useState(plan);
  const [s, setS] = useState(seats);
  const [prov, setProv] = useState(province);
  const [busy, setBusy] = useState(false);

  const subtotal = s * pricePerSeat;
  const tax = canadianTax(prov, subtotal);

  async function update(action?: "pay") {
    setBusy(true);
    await fetch("/api/console/billing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: p, seats: s, province: prov, action }) });
    router.refresh(); setBusy(false);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="rounded-xl ring-1 ring-black/10 p-6 space-y-4">
        <label className="block text-sm">
          <span className="text-gray-600">Plan</span>
          <select value={p} onChange={(e) => setP(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 capitalize">
            {["starter", "team", "brokerage"].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <div className="block text-sm">
          <span className="text-gray-600">Seats</span>
          <div className="mt-1 flex items-center gap-3">
            <button onClick={() => setS(Math.max(1, s - 1))} className="w-9 h-9 rounded-md ring-1 ring-gray-300 text-lg">−</button>
            <span className="w-10 text-center font-semibold text-lg">{s}</span>
            <button onClick={() => setS(Math.min(200, s + 1))} className="w-9 h-9 rounded-md ring-1 ring-gray-300 text-lg">+</button>
            <span className="text-xs text-gray-400">× {formatPrice(pricePerSeat)}/seat/mo</span>
          </div>
        </div>
        <label className="block text-sm">
          <span className="text-gray-600">Billing province</span>
          <select value={prov} onChange={(e) => setProv(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
            {PROVINCES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <button onClick={() => update()} disabled={busy} className="w-full rounded-md ring-1 ring-gray-300 py-2.5 text-sm hover:bg-gray-50">Update subscription</button>
      </div>

      <div className="rounded-xl ring-1 ring-black/10 p-6">
        <div className="text-sm text-gray-500">Monthly total <span className="capitalize text-xs rounded-full bg-gray-100 px-2 py-0.5 ml-1">{status}</span></div>
        <div className="text-4xl font-bold text-gray-900">{formatPrice(tax.total)}<span className="text-base font-normal text-gray-500">/mo</span></div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k={`${s} seats × ${formatPrice(pricePerSeat)}`} v={formatPrice(subtotal)} />
          <Row k={`${tax.label} (${prov}, ${(tax.rate * 100).toFixed(tax.rate * 100 % 1 ? 3 : 0)}%)`} v={formatPrice(tax.tax)} />
          <div className="border-t pt-2 flex justify-between font-semibold"><dt>Total</dt><dd>{formatPrice(tax.total)}</dd></div>
        </dl>
        <button onClick={() => update("pay")} disabled={busy} className="mt-4 w-full rounded-md bg-accent hover:bg-accent-600 text-white font-medium py-2.5">
          💳 {status === "trialing" ? "Activate & pay (demo)" : "Pay invoice (demo)"}
        </button>
        <p className="mt-2 text-[11px] text-gray-400">Mock checkout — no real charge. Production uses Stripe Billing + Stripe Tax to collect GST/HST/PST/QST and monitor the $30,000 GST registration threshold.</p>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-gray-600"><dt>{k}</dt><dd className="font-medium text-gray-800">{v}</dd></div>;
}
