"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { monthlyPayment } from "@/lib/mortgage";
import { formatPrice } from "@/lib/format";

export default function MortgageWidget({ price }: { price: number }) {
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(4.79);
  const [amort, setAmort] = useState(25);

  const pay = useMemo(() => {
    const principal = price * (1 - down / 100);
    return monthlyPayment(principal, rate, amort);
  }, [price, down, rate, amort]);

  return (
    <div className="rounded-xl ring-1 ring-black/10 p-4">
      <div className="text-sm text-gray-500">Estimated monthly payment</div>
      <div className="text-3xl font-bold text-gray-900">{formatPrice(Math.round(pay))}<span className="text-base font-normal text-gray-500">/mo</span></div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <Field label={`Down ${down}%`}><input aria-label="Down payment percent" type="range" min={5} max={50} value={down} onChange={(e) => setDown(+e.target.value)} className="w-full" /></Field>
        <Field label="Rate %"><input aria-label="Interest rate" type="number" step={0.01} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1" /></Field>
        <Field label="Amort. (yrs)">
          <select aria-label="Amortization years" value={amort} onChange={(e) => setAmort(+e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1">
            {[15, 20, 25, 30].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
      </div>
      <p className="mt-3 text-[11px] text-gray-400">Canadian semi-annual compounding. Estimate only — excludes taxes, insurance &amp; CMHC. <Link href="/mortgage" className="text-brand hover:underline">Full calculator →</Link></p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs text-gray-500 mb-1">{label}</span>{children}</label>;
}
