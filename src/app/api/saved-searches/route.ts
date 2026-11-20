import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = (body.name as string) || "Saved search";
  const query = body.query ?? {};
  const frequency = (body.frequency as string) || "daily";
  const ss = await prisma.savedSearch.create({
    data: { userId, name, queryJson: JSON.stringify(query), alertFrequency: frequency, channel: "email" },
  });
  return NextResponse.json({ ok: true, id: ss.id });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.savedSearch.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
