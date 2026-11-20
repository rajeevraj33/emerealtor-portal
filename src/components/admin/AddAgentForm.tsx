"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddAgentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/console/agents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), isTeamLead: !!fd.get("lead") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(data.error ?? "Failed to add agent."); return; }
    setResult({ email: data.email, tempPassword: data.tempPassword });
    router.refresh();
  }

  if (result) {
    return (
      <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-3 text-sm">
        <p className="font-medium text-emerald-800">✓ Agent account created.</p>
        <p className="mt-1 text-gray-700">Login: <strong>{result.email}</strong> · temp password: <code className="bg-white px-1.5 py-0.5 rounded">{result.tempPassword}</code> (also emailed).</p>
        <button onClick={() => { setResult(null); setOpen(false); }} className="mt-2 text-xs text-emerald-700 hover:underline">Add another</button>
      </div>
    );
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium px-3 py-1.5">+ Add agent</button>;

  return (
    <form onSubmit={submit} className="rounded-lg ring-1 ring-black/10 p-3 space-y-2 bg-white">
      <div className="grid sm:grid-cols-2 gap-2">
        <input name="name" required placeholder="Full name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <input name="email" type="email" required placeholder="Email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <input name="phone" placeholder="Phone (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" name="lead" /> Team lead</label>
      </div>
      {err && <p className="text-sm text-accent">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-60">{busy ? "Adding…" : "Create agent"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-800 px-2">Cancel</button>
      </div>
      <p className="text-[11px] text-gray-400">Creates a tenant-scoped agent login + emails them a temporary password.</p>
    </form>
  );
}
