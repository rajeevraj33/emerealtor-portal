"use client";
import { usePathname } from "next/navigation";

export default function TenantSwitcher({ tenants, active }: { tenants: { slug: string; name: string }[]; active: string }) {
  const path = usePathname();
  return (
    <label className="flex items-center gap-1 text-xs text-white/70" title="Demo: switch white-label site (stands in for subdomain routing)">
      <span className="hidden sm:inline">demo site:</span>
      <select
        value={active}
        onChange={(e) => { window.location.href = `/api/tenant/switch?slug=${e.target.value}&to=${encodeURIComponent(path)}`; }}
        className="bg-brand-700 text-white rounded px-1.5 py-0.5 border border-white/20"
      >
        {tenants.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
      </select>
    </label>
  );
}
