import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import ExitImpersonation from "./ExitImpersonation";

export default async function ImpersonationBanner() {
  const jar = await cookies();
  if (!jar.get("eme_impersonator")) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="bg-amber-400 text-amber-950 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center justify-between">
        <span>👁️ Impersonating <strong>{user.name ?? user.email}</strong> ({user.role}) — actions are audit-logged.</span>
        <ExitImpersonation />
      </div>
    </div>
  );
}
