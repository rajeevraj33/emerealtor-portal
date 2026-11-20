import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

const COOKIE = "eme_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret-change-me-please-32chars!");

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.uid as string) ?? null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
  vowAcceptedAt: Date | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const uid = await getUserId();
  if (!uid) return null;
  const u = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, tenantId: true, email: true, name: true, role: true, vowAcceptedAt: true },
  });
  return u;
}

/** VOW entitlement: a registered user who has accepted the VOW Terms of Use may see VOW data. */
export function canViewVow(user: SessionUser | null): boolean {
  return !!user && !!user.vowAcceptedAt;
}
