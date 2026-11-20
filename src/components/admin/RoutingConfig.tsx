"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STRATEGIES = [
  { key: "round-robin", label: "Round-robin", desc: "Cycle leads evenly across all active agents." },
  { key: "first-to-claim", label: "First-to-claim", desc: "Leave leads in a shared queue with an SLA; agents claim them." },
  { key: "geographic", label: "Geographic", desc: "Prefer agents whose region matches the lead, then round-robin." },
];

export default function RoutingConfig({ current }: { current: string }) {
  const router = useRouter();
  const [val, setVal] = useState(current);
  const [saved, setSaved] = useState(false);

  async function change(strategy: string) {
    setVal(strategy); setSaved(false);
    const res = await fetch("/api/console/routing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy }) });
    if (res.ok) { setSaved(true); router.refresh(); }
  }

  return (
    <div className="space-y-2">
      {STRATEGIES.map((s) => (
        <label key={s.key} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${val === s.key ? "border-brand bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
          <input type="radio" name="strategy" checked={val === s.key} onChange={() => change(s.key)} className="mt-1" />
          <div>
            <div className="font-medium text-gray-900">{s.label}</div>
            <div className="text-xs text-gray-500">{s.desc}</div>
          </div>
        </label>
      ))}
      {saved && <p className="text-xs text-green-700">Saved — new leads route this way.</p>}
    </div>
  );
}
