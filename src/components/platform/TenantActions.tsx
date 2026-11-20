"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TenantActions({ tenantId, adminUserId, status }: { tenantId: string; adminUserId?: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function impersonate() {
    if (!adminUserId || busy) return;
    setBusy(true);
    const res = await fetch("/api/platform/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: adminUserId }) });
    if (res.ok) { router.push("/console"); router.refresh(); } else setBusy(false);
  }
  async function toggle() {
    setBusy(true);
    const next = status === "active" ? "suspended" : "active";
    await fetch("/api/platform/tenant", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, status: next }) });
    router.refresh(); setBusy(false);
  }

  return (
    <div className="flex gap-2 justify-end">
      <button onClick={impersonate} disabled={!adminUserId || busy} className="rounded bg-brand text-[var(--brand-fg)] text-xs px-2.5 py-1 hover:bg-brand-700 disabled:opacity-50">View as admin</button>
      <button onClick={toggle} disabled={busy} className={`rounded text-xs px-2.5 py-1 ${status === "active" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-green-100 text-green-800 hover:bg-green-200"}`}>
        {status === "active" ? "Suspend" : "Activate"}
      </button>
    </div>
  );
}
