"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";

// Homepage "get in touch" form — creates a lead routed directly to the given agent.
export default function HomeContactForm({ agentId, agentName }: { agentId: string; agentName: string }) {
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
        type: "buyer", agentId,
        name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"),
        message: (fd.get("message") as string) || "Enquiry from the homepage.",
        sourcePage: "/",
      }),
    });
    if (res.ok) { track("generate_lead", { type: "home_contact" }); setDone(true); }
    else setErr("Something went wrong. Please try again.");
    setBusy(false);
  }

  if (done) return (
    <div className="rounded-xl bg-green-50 text-green-800 p-5 text-sm ring-1 ring-green-100">
      ✓ Thank you — {agentName} will be in touch with you shortly.
    </div>
  );

  const field = "w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm focus:border-accent";
  return (
    <form onSubmit={submit} className="space-y-3">
      <input name="name" required placeholder="Full name" className={field} style={{ outline: "none" }} />
      <input name="email" type="email" required placeholder="Email address" className={field} style={{ outline: "none" }} />
      <input name="phone" placeholder="Phone (optional)" className={field} style={{ outline: "none" }} />
      <textarea name="message" rows={3} placeholder={`How can ${agentName} help you?`} className={field} style={{ outline: "none" }} />
      <label className="flex items-start gap-2 text-xs text-gray-500">
        <input type="checkbox" name="consent" className="mt-0.5" />
        <span>I agree to be contacted about my enquiry (CASL consent).</span>
      </label>
      {err && <p className="text-xs text-accent">{err}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent hover:bg-accent-600 text-white text-sm font-semibold py-2.5 disabled:opacity-60">
        {busy ? "Sending…" : "Get in touch"}
      </button>
    </form>
  );
}
