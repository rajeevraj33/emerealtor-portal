"use client";
import { useState } from "react";

const OPTS = ["new", "contacted", "qualified", "closed"];
const tone: Record<string, string> = { new: "bg-accent/10 text-accent", contacted: "bg-amber-100 text-amber-700", qualified: "bg-blue-100 text-blue-700", closed: "bg-green-100 text-green-700" };

export default function LeadStatus({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial);
  async function change(v: string) {
    setStatus(v);
    await fetch("/api/leads/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, action: "status", status: v }) });
  }
  return (
    <select value={status} onChange={(e) => change(e.target.value)} className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${tone[status] ?? "bg-gray-100"}`}>
      {OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
