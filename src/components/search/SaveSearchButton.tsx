"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SaveSearchButton({ params }: { params: Record<string, unknown>; count: number }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy || saved) return;
    setBusy(true);
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: params, name: buildName(params) }),
    });
    if (res.status === 401) { router.push(`/signup?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
    setSaved(res.ok);
    setBusy(false);
  }

  return (
    <button onClick={save} disabled={saved}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${saved ? "bg-green-50 text-green-700" : "bg-accent text-white hover:bg-accent-600"}`}>
      🔔 {saved ? "Alert saved" : "Get Alerts"}
    </button>
  );
}

function buildName(p: Record<string, unknown>): string {
  const mode = p.status === "Sold" ? "Sold" : p.mode === "Rent" ? "For Rent" : "For Sale";
  const nb = (p.neighbourhood as string) ?? (p.location as string) ?? "Mississauga";
  return `${mode} · ${nb}`;
}
