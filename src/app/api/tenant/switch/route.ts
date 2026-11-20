import { NextRequest, NextResponse } from "next/server";

// Demo affordance: flip the active tenant via a cookie (stands in for subdomain/custom-domain routing locally).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug");
  const to = sp.get("to") || "/";
  const res = NextResponse.redirect(new URL(to, req.url));
  if (slug) res.cookies.set("eme_tenant", slug, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
