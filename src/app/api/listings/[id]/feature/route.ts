import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Toggle a listing's Featured flag. "Featured" is a business decision (not an MLS
// field), so any staff role can promote a listing.
const STAFF = ["platform_admin", "brokerage_admin", "team_lead", "agent"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || !STAFF.includes(me.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const { featured } = await req.json().catch(() => ({}));
  const listing = await prisma.listing.update({ where: { id }, data: { isFeatured: !!featured } });
  return NextResponse.json({ ok: true, isFeatured: listing.isFeatured });
}
