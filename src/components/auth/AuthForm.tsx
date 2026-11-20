"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";

export default function AuthForm({ mode, next }: { mode: "signup" | "login"; next: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthNote, setOauthNote] = useState("");
  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const fd = new FormData(e.currentTarget);
    if (isSignup && !fd.get("vow")) { setErr("Please accept the VOW Terms of Use to continue."); setBusy(false); return; }
    const payload = isSignup
      ? { name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), vow: !!fd.get("vow"), casl: !!fd.get("casl") }
      : { email: fd.get("email"), password: fd.get("password") };
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { track(isSignup ? "sign_up" : "login"); router.push(next || "/account"); router.refresh(); return; }
    setErr(data.error ?? "Something went wrong."); setBusy(false);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      {isSignup && (
        <div className="rounded-xl bg-brand-50 p-6">
          <h2 className="font-semibold text-gray-900">Create a free account to unlock:</h2>
          <ul className="mt-3 space-y-3 text-sm text-gray-700">
            <li>🕑 <strong>Sold &amp; rented data</strong> — explore years of sold listings and price history.</li>
            <li>♥ <strong>Save favourites</strong> with notes and side-by-side comparison.</li>
            <li>🔔 <strong>Listing alerts</strong> — be first to know when a matching home lists.</li>
            <li>📷 <strong>Full photo galleries</strong> and instant Home Value Estimates.</li>
          </ul>
          <p className="mt-4 text-[11px] text-gray-500">Sold/price-history is VOW data shown only to registered users who accept the VOW Terms of Use (TRREB rule). We email you only with consent (CASL).</p>
        </div>
      )}

      <div className="rounded-xl ring-1 ring-black/10 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">{isSignup ? "Create your account" : "Log in to your account"}</h1>
        <form onSubmit={submit} className="space-y-3">
          {isSignup && <input name="name" placeholder="Full name" className="w-full rounded-md border border-gray-300 px-3 py-2" />}
          <input name="email" type="email" required placeholder="Email address" autoComplete="email" className="w-full rounded-md border border-gray-300 px-3 py-2" />
          <input name="password" type="password" required placeholder={isSignup ? "Password (min 8 characters)" : "Password"} autoComplete={isSignup ? "new-password" : "current-password"} className="w-full rounded-md border border-gray-300 px-3 py-2" />

          {isSignup && (
            <>
              <label className="flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" name="vow" className="mt-0.5" />
                <span>I have read and accept the <span className="text-brand underline">VOW Terms of Use</span>, establishing a broker–consumer relationship to view sold and price-history data. <span className="text-accent">(required)</span></span>
              </label>
              <label className="flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" name="casl" className="mt-0.5" defaultChecked />
                <span>Email me listing alerts and updates. I consent to commercial electronic messages and can unsubscribe anytime (CASL).</span>
              </label>
            </>
          )}

          {err && <p className="text-sm text-accent" role="alert">{err}</p>}
          <button disabled={busy} className="w-full rounded-md bg-accent hover:bg-accent-600 text-white font-medium py-2.5 disabled:opacity-60">
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
          <a href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} className="mt-2 w-full inline-flex justify-center items-center gap-2 rounded-md ring-1 ring-gray-300 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            <span aria-hidden>🔵</span> Continue with Google
          </a>
        ) : (
          <button type="button" onClick={() => setOauthNote("Google sign-in isn’t set up on this site yet — please continue with email & password.")} className="mt-2 w-full inline-flex justify-center items-center gap-2 rounded-md ring-1 ring-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            <span aria-hidden>🔵</span> Continue with Google
          </button>
        )}
        {oauthNote && <p className="mt-2 text-xs text-center text-gray-500" role="status">{oauthNote}</p>}
        <p className="mt-4 text-sm text-gray-500">
          {isSignup ? <>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-brand hover:underline">Log in</Link></>
            : <>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-brand hover:underline">Create an account</Link></>}
        </p>
        {!isSignup && <p className="mt-2 text-xs text-gray-400">Demo login: demo@emeinfotech.ai / password123</p>}
      </div>
    </div>
  );
}
