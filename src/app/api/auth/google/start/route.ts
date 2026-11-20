import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/origin";

// Step 1 of Google OAuth — redirect to Google's consent screen.
// Activates once NEXT_PUBLIC_GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const origin = appOrigin(req);
  const next = req.nextUrl.searchParams.get("next") || "/account";
  if (!clientId) return NextResponse.redirect(`${origin}/login?error=google_unconfigured`);

  const redirectUri = `${origin}/api/auth/google/callback`;
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("access_type", "online");
  u.searchParams.set("state", next);
  return NextResponse.redirect(u.toString());
}
