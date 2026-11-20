import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActiveTenantId } from "@/lib/tenant";
import { createSession } from "@/lib/session";
import { appOrigin } from "@/lib/origin";

// Step 2 of Google OAuth — exchange the code, fetch the email, create/login the user.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("state") || "/account";
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = appOrigin(req);
  if (!code || !clientId || !secret) return NextResponse.redirect(`${origin}/login?error=google`);

  const redirectUri = `${origin}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const tok = await tokenRes.json().catch(() => ({}));
  if (!tok.access_token) return NextResponse.redirect(`${origin}/login?error=google_token`);

  const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json()).catch(() => ({}));
  const email = (info.email as string)?.toLowerCase();
  if (!email) return NextResponse.redirect(`${origin}/login?error=google_email`);

  const tenantId = await getActiveTenantId();
  let user = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (!user) {
    user = await prisma.user.create({ data: { tenantId, email, name: (info.name as string) ?? null, passwordHash: await bcrypt.hash(globalThis.crypto.randomUUID(), 10), emailVerified: true, vowAcceptedAt: new Date(), role: "consumer" } });
    await prisma.vowAcceptance.create({ data: { tenantId, userId: user.id, version: "1.0" } });
  }
  await createSession(user.id);
  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/" + next}`);
}
