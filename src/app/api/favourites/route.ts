import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const { listingId } = await req.json().catch(() => ({}));
  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const existing = await prisma.favourite.findUnique({ where: { userId_listingId: { userId, listingId } } });
  if (existing) {
    await prisma.favourite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favourited: false });
  }
  await prisma.favourite.create({ data: { userId, listingId } });
  return NextResponse.json({ favourited: true });
}
