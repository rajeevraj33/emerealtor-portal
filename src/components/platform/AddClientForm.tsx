"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ email: string; tempPassword: string; subdomain: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/platform/create-client", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerageName: fd.get("brokerageName"), bor: fd.get("bor"), email: fd.get("email"), recoId: fd.get("recoId"), subdomain: fd.get("subdomain"), plan: fd.get("plan") }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(data.error ?? "Failed to create client."); return; }
    setResult({ email: data.email, tempPassword: data.tempPassword, subdomain: data.subdomain });
    router.refresh();
  }

  if (result) {
    return (
      <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-4 text-sm">
        <p className="font-medium text-emerald-800">✓ Client provisioned — their own isolated tenant.</p>
        <p className="mt-1 text-gray-700">Admin login: <strong>{result.email}</strong> · temp password: <code className="bg-white px-1.5 py-0.5 rounded">{result.tempPassword}</code> · subdomain: <strong>{result.subdomain}</strong> (also emailed).</p>
        <button onClick={() => { setResult(null); setOpen(false); }} className="mt-2 text-xs text-emerald-700 hover:underline">Add another client</button>
      </div>
    );
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium px-3 py-1.5">+ Add client</button>;

  return (
    <form onSubmit={submit} className="rounded-lg ring-1 ring-black/10 p-4 space-y-2 bg-white max-w-xl">
      <h3 className="font-semibold text-gray-900 text-sm">Provision a new client (company or solo agent)</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        <input name="brokerageName" required placeholder="Company / brokerage name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <input name="subdomain" placeholder="Subdomain (auto if blank)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <input name="bor" required placeholder="Admin / broker name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <input name="email" type="email" required placeholder="Admin email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <input name="recoId" placeholder="RECO # (e.g. REG-1234567)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
        <select name="plan" defaultValue="team" className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
          <option value="starter">Starter</option>
          <option value="team">Team</option>
          <option value="brokerage">Brokerage</option>
        </select>
      </div>
      {err && <p className="text-sm text-accent">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-60">{busy ? "Creating…" : "Create client"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-800 px-2">Cancel</button>
      </div>
      <p className="text-[11px] text-gray-400">Creates an isolated tenant + brokerage-admin login. The new admin can then add their own agents.</p>
    </form>
  );
}
