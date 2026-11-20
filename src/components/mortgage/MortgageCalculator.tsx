"use client";
import { useMemo, useState } from "react";
import { monthlyPayment, cmhcPremiumRate, minDownPayment, stressTestRate, landTransferTax } from "@/lib/mortgage";
import { formatPrice } from "@/lib/format";

export default function MortgageCalculator() {
  const [price, setPrice] = useState(1100000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.79);
  const [amort, setAmort] = useState(25);

  const m = useMemo(() => {
    const down = price * (downPct / 100);
    const minDown = minDownPayment(price);
    const belowMin = down < minDown - 1;
    const loanBeforeIns = Math.max(0, price - down);
    const cmhcRate = cmhcPremiumRate(price, downPct);
    const premium = loanBeforeIns * cmhcRate;
    const loan = loanBeforeIns + premium;
    const payment = monthlyPayment(loan, rate, amort);
    const sRate = stressTestRate(rate);
    const sPayment = monthlyPayment(loan, sRate, amort);
    return { down, minDown, belowMin, loan, premium, cmhcRate, payment, sRate, sPayment };
  }, [price, downPct, rate, amort]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="rounded-xl ring-1 ring-black/10 p-6 space-y-4 self-start">
        <NumberField label="Home price" value={price} onChange={setPrice} step={10000} prefix="$" />
        <div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">Down payment</span><span className="font-medium">{downPct}% · {formatPrice(m.down)}</span></div>
          <input aria-label="Down payment percent" type="range" min={5} max={50} value={downPct} onChange={(e) => setDownPct(+e.target.value)} className="w-full" />
          {m.belowMin && <p className="text-xs text-accent">Minimum down payment for this price is {formatPrice(m.minDown)}.</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Interest rate (%)" value={rate} onChange={setRate} step={0.01} />
          <label className="block text-sm">
            <span className="text-gray-600">Amortization</span>
            <select value={amort} onChange={(e) => setAmort(+e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
              {[15, 20, 25, 30].map((y) => <option key={y} value={y}>{y} years</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-black/10 p-6">
        <div className="text-sm text-gray-500">Estimated monthly payment</div>
        <div className="text-4xl font-bold text-gray-900">{formatPrice(Math.round(m.payment))}<span className="text-base font-normal text-gray-500">/mo</span></div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Mortgage amount" v={formatPrice(Math.round(m.loan))} />
          {m.premium > 0 && <Row k={`CMHC insurance (${(m.cmhcRate * 100).toFixed(2)}%)`} v={formatPrice(Math.round(m.premium))} hint="added to mortgage (down payment < 20%)" />}
          <Row k="Down payment" v={formatPrice(Math.round(m.down))} />
          <Row k={`B-20 stress test @ ${m.sRate.toFixed(2)}%`} v={`${formatPrice(Math.round(m.sPayment))}/mo`} hint="you must qualify at this payment" />
        </dl>
        <p className="mt-3 text-[11px] text-gray-400">Canadian fixed-rate mortgages compound <strong>semi-annually</strong>. Stress test = greater of contract + 2% or 5.25%. Homes ≥ $1M require 20% down and are not CMHC-insurable. Estimate only; excludes property tax, condo fees &amp; insurance.</p>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, prefix }: { label: string; value: number; onChange: (n: number) => void; step?: number; prefix?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="mt-1 flex items-center rounded-md border border-gray-300 px-3">
        {prefix && <span className="text-gray-400">{prefix}</span>}
        <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full py-2 outline-none" />
      </div>
    </label>
  );
}
function Row({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between">
      <dt className="text-gray-500">{k}{hint && <span className="block text-[11px] text-gray-400">{hint}</span>}</dt>
      <dd className="font-semibold text-gray-800">{v}</dd>
    </div>
  );
}

export function LttCalculator() {
  const [price, setPrice] = useState(1100000);
  const [toronto, setToronto] = useState(false);
  const [firstTime, setFirstTime] = useState(false);
  const r = useMemo(() => landTransferTax(price, toronto, firstTime), [price, toronto, firstTime]);

  return (
    <div className="grid lg:grid-cols-2 gap-8" id="ltt">
      <div className="rounded-xl ring-1 ring-black/10 p-6 space-y-4 self-start">
        <NumberField label="Purchase price" value={price} onChange={setPrice} step={10000} prefix="$" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={toronto} onChange={(e) => setToronto(e.target.checked)} /> Property is in the City of Toronto (adds municipal LTT)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={firstTime} onChange={(e) => setFirstTime(e.target.checked)} /> First-time home buyer (rebate)</label>
      </div>
      <div className="rounded-xl ring-1 ring-black/10 p-6">
        <div className="text-sm text-gray-500">Land transfer tax payable</div>
        <div className="text-4xl font-bold text-gray-900">{formatPrice(r.net)}</div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Ontario LTT" v={formatPrice(r.ontario)} />
          {toronto && <Row k="Toronto Municipal LTT" v={formatPrice(r.toronto)} />}
          <Row k="Total before rebate" v={formatPrice(r.total)} />
          {firstTime && <Row k="First-time buyer rebate" v={`– ${formatPrice(r.rebate)}`} />}
        </dl>
        <p className="mt-3 text-[11px] text-gray-400">Toronto is the only Ontario municipality with its own LTT, charged on top of the provincial tax. First-time rebates: up to $4,000 (Ontario) + up to $4,475 (Toronto). Brackets are configurable and include Toronto&apos;s higher luxury tiers; confirm current rates before relying on them.</p>
      </div>
    </div>
  );
}
