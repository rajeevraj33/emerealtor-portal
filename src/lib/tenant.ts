import { cookies, headers } from "next/headers";
import { cache } from "react";
import { prisma } from "./prisma";
import type { Tenant } from "@prisma/client";

/**
 * Resolve the active tenant for this request.
 * Production path: custom domain → subdomain. Local/demo path: a `eme_tenant` cookie
 * set by the demo tenant-switcher takes precedence (real subdomains/SSL aren't available locally).
 */
export const getActiveTenant = cache(async (): Promise<Tenant> => {
  const jar = await cookies();
  const override = jar.get("eme_tenant")?.value;
  if (override) {
    const t = await prisma.tenant.findUnique({ where: { slug: override } });
    if (t) return t;
  }
  const h = await headers();
  const host = (h.get("host") ?? "").split(":")[0].toLowerCase();

  if (host) {
    const dom = await prisma.domain.findUnique({ where: { host } });
    if (dom) {
      const t = await prisma.tenant.findUnique({ where: { id: dom.tenantId } });
      if (t) return t;
    }
    const sub = host.split(".")[0];
    if (sub && sub !== "localhost" && sub !== "www" && sub !== "127") {
      const t = await prisma.tenant.findUnique({ where: { subdomain: sub } });
      if (t) return t;
    }
  }
  const def = await prisma.tenant.findFirst({ where: { isDefault: true } });
  if (!def) throw new Error("No default tenant — run the seed.");
  return def;
});

export async function getActiveTenantId(): Promise<string> {
  return (await getActiveTenant()).id;
}

/** Legacy helper retained for any single-tenant callers. */
export async function getDefaultTenantId(): Promise<string> {
  const t = await prisma.tenant.findFirst({ where: { isDefault: true } });
  if (!t) throw new Error("No default tenant — run the seed.");
  return t.id;
}

// Is the brand colour light enough that it needs dark foreground text?
export function isLightBrand(t: Tenant): boolean {
  const h = (t.brandColor || "#0f3d4c").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}

export function brandStyle(t: Tenant): React.CSSProperties {
  const light = isLightBrand(t);
  return {
    ["--color-brand" as string]: t.brandColor,
    ["--color-brand-700" as string]: t.brandColor700,
    ["--color-brand-50" as string]: t.brandColor50,
    ["--color-accent" as string]: t.accentColor,
    // foreground for text/icons sitting ON a brand-coloured surface
    ["--brand-fg" as string]: light ? "#111827" : "#ffffff",
    ["--brand-fg-soft" as string]: light ? "rgba(17,24,39,0.72)" : "rgba(255,255,255,0.82)",
    ["--brand-hover" as string]: light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
  };
}
