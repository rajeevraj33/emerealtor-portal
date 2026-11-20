"use client";
import { useState } from "react";

export default function ContactAgent({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const fd = new FormData(e.currentTarget);
    if (!fd.get("consent")) { setErr("Please accept contact consent (CASL)."); setBusy(false); return; }
    const res = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, type: "buyer", name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), message: fd.get("message"), sourcePage: location.pathname }),
    });
    if (res.ok) setDone(true); else setErr("Something went wrong.");
    setBusy(false);
  }

  if (done) return <div className="rounded-lg bg-green-50 text-green-800 p-4 text-sm">✓ Message sent — {agentName} will be in touch shortly.</div>;

  return (
    <form onSubmit={submit} className="space-y-2">
      <input name="name" required placeholder="Your name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <textarea name="message" rows={3} placeholder={`Hi ${agentName.split(" ")[0]}, I'd like help with…`} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <label className="flex items-start gap-2 text-xs text-gray-500"><input type="checkbox" name="consent" className="mt-0.5" /><span>I agree to be contacted about this enquiry (CASL consent).</span></label>
      {err && <p className="text-xs text-accent">{err}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent hover:bg-accent-600 text-white font-medium py-2.5 disabled:opacity-60">{busy ? "Sending…" : `Contact ${agentName.split(" ")[0]}`}</button>
    </form>
  );
}
