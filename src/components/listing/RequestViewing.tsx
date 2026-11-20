"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";

export default function RequestViewing({ listingId, agentName }: { listingId: string; agentName: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr("");
    const fd = new FormData(e.currentTarget);
    if (!fd.get("consent")) { setErr("Please accept contact consent (CASL)."); setBusy(false); return; }
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId, name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"),
        preferredTime: fd.get("time"), message: fd.get("message"), sourcePage: location.pathname,
      }),
    });
    if (res.ok) { track("generate_lead", { type: "viewing" }); setDone(true); } else setErr("Something went wrong. Please try again.");
    setBusy(false);
  }

  if (done) return (
    <div className="rounded-lg bg-green-50 text-green-800 p-4 text-sm">
      ✓ Request sent! {agentName} will reach out shortly to arrange your viewing.
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-2">
      <input name="name" required placeholder="Full name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="time" placeholder="Preferred date/time" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <textarea name="message" rows={2} placeholder="Message (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <label className="flex items-start gap-2 text-xs text-gray-500">
        <input type="checkbox" name="consent" className="mt-0.5" />
        <span>I agree to be contacted by email/phone about this enquiry (CASL consent).</span>
      </label>
      {err && <p className="text-xs text-accent">{err}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent hover:bg-accent-600 text-white font-medium py-2.5 disabled:opacity-60">
        {busy ? "Sending…" : "Request a viewing"}
      </button>
    </form>
  );
}
