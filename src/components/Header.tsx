import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import NavNeighbourhoods from "@/components/NavNeighbourhoods";
import { getCities } from "@/lib/cities";
import HeaderShell from "@/components/HeaderShell";

export default async function Header() {
  const [user, tenant, cities] = await Promise.all([
    getCurrentUser(),
    getActiveTenant(),
    getCities(),
  ]);

  const roleLink = (() => {
    switch (user?.role) {
      case "platform_admin": return { href: "/platform", label: "Platform" };
      case "brokerage_admin": return { href: "/console", label: "Brokerage Console" };
      case "team_lead":
      case "agent": return { href: "/agent", label: "My Leads" };
      default: return null;
    }
  })();

  return (
    <HeaderShell>
      <Link href="/" className="flex items-center shrink-0" aria-label={`${tenant.name} home`}>
        {/* Hunt property logo on a white badge so it reads on the dark/transparent header */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rzp-key.jpeg" alt={tenant.name} className="h-11 w-auto rounded-md bg-white px-2.5 py-1" />
      </Link>
      <nav className="ml-auto flex items-center gap-1 sm:gap-2 text-sm" aria-label="Primary">
        <Link href="/search?mode=Sale" className="px-3 py-2 rounded hover:bg-white/10">For Sale</Link>
        <Link href="/search?mode=Rent" className="px-3 py-2 rounded hover:bg-white/10">For Rent</Link>
        <div className="hidden md:block"><NavNeighbourhoods cities={cities} /></div>
        <Link href="/agents" className="px-3 py-2 rounded hover:bg-white/10 hidden lg:block">Agents</Link>
        <Link href="/home-estimator" className="px-3 py-2 rounded hover:bg-white/10 hidden md:block">Home Estimator</Link>
        {user ? (
          <div className="flex items-center gap-1 ml-1">
            {roleLink ? (
              <Link href={roleLink.href} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 font-medium">{roleLink.label}</Link>
            ) : (
              <>
                <Link href="/account/saved-searches" className="px-2 py-2 rounded hover:bg-white/10 hidden sm:block" title="Alerts">Alerts</Link>
                <Link href="/account/favourites" className="px-2 py-2 rounded hover:bg-white/10" title="Favourites">♥</Link>
              </>
            )}
            <Link href="/account" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">{user.name?.split(" ")[0] ?? "Account"}</Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-1">
            <Link href="/login" className="px-3 py-2 rounded hover:bg-white/10">Log In</Link>
            <Link href="/signup" className="px-4 py-2 rounded bg-accent hover:bg-accent-600 font-medium">Sign Up</Link>
          </div>
        )}
      </nav>
    </HeaderShell>
  );
}
