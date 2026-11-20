"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const THEMES = [
  { key: "teal", color: "#0f3d4c", accent: "#d6334b" },
  { key: "green", color: "#14532d", accent: "#d97706" },
  { key: "indigo", color: "#312e81", accent: "#e11d48" },
  { key: "slate", color: "#1f2937", accent: "#2563eb" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState("teal");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/onboarding", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brokerageName: fd.get("brokerageName"), bor: fd.get("bor"), recoId: fd.get("recoId"),
        email: fd.get("email"), password: fd.get("password"), subdomain: fd.get("subdomain"), plan: fd.get("plan"), theme,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { router.push("/console"); router.refresh(); return; }
    setErr(data.error ?? "Something went wrong."); setBusy(false);
  }

  return (
    <form onSubmit={submit} className="rounded-xl ring-1 ring-black/10 p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="brokerageName" label="Brokerage name" placeholder="Acme Realty Group" required />
        <Field name="bor" label="Broker of Record" placeholder="Jane Broker" required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="recoId" label="RECO registration #" placeholder="REG-1234567" required hint="We verify with RECO (demo: any REG-#######)." />
        <label className="block text-sm">
          <span className="text-gray-600">Subdomain</span>
          <div className="mt-1 flex items-center rounded-md border border-gray-300 px-3">
            <input name="subdomain" required placeholder="acme" className="w-full py-2 outline-none" />
            <span className="text-gray-400 text-sm">.emeinfotech.app</span>
          </div>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field name="email" type="email" label="Admin email" placeholder="admin@acme.ca" required />
        <Field name="password" type="password" label="Admin password" placeholder="min 8 characters" required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-gray-600">Plan</span>
          <select name="plan" defaultValue="team" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
            <option value="starter">Starter — $99/seat/mo</option>
            <option value="team">Team — $99/seat/mo</option>
            <option value="brokerage">Brokerage — $99/seat/mo</option>
          </select>
        </label>
        <div className="text-sm">
          <span className="text-gray-600">Brand theme</span>
          <div className="mt-1 flex gap-2">
            {THEMES.map((t) => (
              <button type="button" key={t.key} onClick={() => setTheme(t.key)} aria-label={`Theme ${t.key}`}
                className={`w-9 h-9 rounded-full ring-2 ${theme === t.key ? "ring-gray-900" : "ring-transparent"}`} style={{ background: t.color }}>
                <span className="block w-3 h-3 rounded-full mx-auto" style={{ background: t.accent }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-accent" role="alert">{err}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent hover:bg-accent-600 text-white font-medium py-3 disabled:opacity-60">
        {busy ? "Creating your brokerage site…" : "Launch my white-label site →"}
      </button>
      <p className="text-xs text-gray-400">14-day free trial. By continuing you agree to the platform terms; each white-label site must display your brokerage&apos;s legal name and registrant disclosures (TRESA).</p>
    </form>
  );
}

function Field({ name, label, placeholder, type = "text", required, hint }: { name: string; label: string; placeholder?: string; type?: string; required?: boolean; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}
