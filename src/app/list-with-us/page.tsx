import type { Metadata } from "next";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const metadata: Metadata = {
  title: "List your brokerage",
  description: "Launch your own white-label GTA real-estate site in minutes — your brand, your domain, MLS listings, lead routing and an agent CRM.",
};

export default function ListWithUsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your brokerage, your brand.</h1>
          <p className="mt-3 text-gray-600">Launch a white-label GTA property site in minutes — powered by the same platform you&apos;re browsing now.</p>
          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li>🎨 <strong>White-label branding</strong> — your name, colours and custom domain.</li>
            <li>🏠 <strong>MLS listings</strong> (IDX/VOW) with sold data behind the registration wall.</li>
            <li>🔀 <strong>Lead routing</strong> — round-robin, first-to-claim or geographic, across your team.</li>
            <li>📇 <strong>Agent CRM</strong> dashboards, plus a public agent directory.</li>
            <li>🇨🇦 <strong>Compliance built-in</strong> — VOW gating, CASL consent, RECO/TRESA attribution.</li>
          </ul>
          <p className="mt-6 text-xs text-gray-400">Demo build — each new brokerage spins up its own tenant, branding, subdomain, subscription and routing config on the shared listings pool.</p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
