"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";

export default function ContactAgent({ listingId, agentId, agentName }: { listingId: string; agentId: string; agentName: string }) {
  const [open, setOpen] = useState(false);
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
      body: JSON.stringify({
        type: "buyer", agentId, listingId,
        name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"),
        message: (fd.get("message") as string) || `Enquiry about this listing.`,
        sourcePage: location.pathname,
      }),
    });
    if (res.ok) { track("generate_lead", { type: "contact_agent" }); setDone(true); } else setErr("Something went wrong. Please try again.");
    setBusy(false);
  }

  if (done) return <div className="mt-2 rounded-lg bg-green-50 text-green-800 p-3 text-sm">✓ Message sent — {agentName} will be in touch.</div>;

  if (!open) return (
    <button onClick={() => setOpen(true)} className="mt-2 w-full rounded-md ring-1 ring-gray-300 hover:bg-gray-50 text-sm font-medium py-2.5 text-gray-800">
      Contact agent
    </button>
  );

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <input name="name" required placeholder="Full name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
      <textarea name="message" rows={2} placeholder={`Message to ${agentName}`} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" style={{ outline: "none" }} />
      <label className="flex items-start gap-2 text-xs text-gray-500">
        <input type="checkbox" name="consent" className="mt-0.5" />
        <span>I agree to be contacted about this enquiry (CASL consent).</span>
      </label>
      {err && <p className="text-xs text-accent">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="flex-1 rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-medium py-2 disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-800 px-2">Cancel</button>
      </div>
    </form>
  );
}
