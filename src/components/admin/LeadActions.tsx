"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClaimButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function claim() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/leads/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, action: "claim" }) });
    if (res.ok) router.refresh();
    else setBusy(false);
  }
  return <button onClick={claim} disabled={busy} className="rounded-full bg-accent text-white text-xs font-medium px-3 py-1 hover:bg-accent-600 disabled:opacity-60">{busy ? "…" : "Claim"}</button>;
}

export function ReassignControl({ leadId, agents, current }: { leadId: string; agents: { id: string; name: string }[]; current: string | null }) {
  const router = useRouter();
  async function reassign(agentId: string) {
    if (!agentId) return;
    await fetch("/api/leads/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, action: "reassign", agentId }) });
    router.refresh();
  }
  return (
    <select defaultValue={current ?? ""} onChange={(e) => reassign(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs max-w-[140px]">
      <option value="" disabled>Unassigned</option>
      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}
