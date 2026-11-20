"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Domain = { id: string; host: string; isPrimary: boolean; verified: boolean; sslStatus: string };

export default function Domains({ domains }: { domains: Domain[] }) {
  const router = useRouter();
  const [host, setHost] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/console/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setHost(""); router.refresh(); } else setErr(data.error ?? "Failed");
    setBusy(false);
  }
  async function act(id: string, action: string) {
    await fetch("/api/console/domains", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    router.refresh();
  }
  async function del(id: string) {
    await fetch(`/api/console/domains?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  const ssl = (d: Domain) => d.sslStatus === "issued" ? "text-green-700" : d.sslStatus === "failed" ? "text-accent" : "text-amber-600";

  return (
    <div>
      <div className="rounded-xl ring-1 ring-black/10 divide-y">
        {domains.map((d) => (
          <div key={d.id} className="p-3 flex items-center justify-between gap-3 text-sm flex-wrap">
            <div>
              <span className="font-medium text-gray-900">{d.host}</span>
              {d.isPrimary && <span className="ml-2 text-[10px] bg-brand text-[var(--brand-fg)] rounded px-1.5 py-0.5">primary</span>}
              <div className="text-xs text-gray-500">{d.verified ? "DNS verified" : "DNS not verified"} · SSL <span className={ssl(d)}>{d.sslStatus}</span></div>
            </div>
            <div className="flex items-center gap-2">
              {!d.verified && <button onClick={() => act(d.id, "verify")} className="rounded bg-accent text-white text-xs px-2.5 py-1 hover:bg-accent-600">Verify DNS &amp; issue SSL</button>}
              {d.verified && !d.isPrimary && <button onClick={() => act(d.id, "primary")} className="rounded ring-1 ring-gray-300 text-xs px-2.5 py-1 hover:bg-gray-50">Make primary</button>}
              {!d.host.endsWith(".localhost") && <button onClick={() => del(d.id)} className="text-xs text-gray-400 hover:text-accent">Remove</button>}
            </div>
          </div>
        ))}
        {domains.length === 0 && <div className="p-4 text-gray-500 text-sm">No domains yet.</div>}
      </div>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="homes.yourbrokerage.ca" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button disabled={busy} className="rounded-md bg-brand text-[var(--brand-fg)] px-4 py-2 text-sm hover:bg-brand-700 disabled:opacity-60">Add domain</button>
      </form>
      {err && <p className="mt-1 text-xs text-accent">{err}</p>}
      <p className="mt-2 text-[11px] text-gray-400">Add a CNAME to <code>cname.emeinfotech.app</code>, then verify. Production auto-issues a certificate via ACME (Let&apos;s Encrypt). This demo mocks DNS verification &amp; SSL issuance.</p>
    </div>
  );
}
