import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function guard() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "brokerage_admin" && user.role !== "platform_admin")) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { host } = await req.json().catch(() => ({}));
  const clean = (host as string)?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!clean || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) return NextResponse.json({ error: "Enter a valid domain (e.g. homes.acme.ca)." }, { status: 400 });
  const exists = await prisma.domain.findUnique({ where: { host: clean } });
  if (exists) return NextResponse.json({ error: "Domain already registered." }, { status: 409 });
  await prisma.domain.create({ data: { tenantId: user.tenantId, host: clean, verified: false, sslStatus: "pending" } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id, action } = await req.json().catch(() => ({}));
  const dom = await prisma.domain.findUnique({ where: { id } });
  if (!dom || dom.tenantId !== user.tenantId) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "verify") {
    // mock DNS check + ACME issuance
    await prisma.domain.update({ where: { id }, data: { verified: true, sslStatus: "issued" } });
  } else if (action === "primary") {
    await prisma.domain.updateMany({ where: { tenantId: user.tenantId }, data: { isPrimary: false } });
    await prisma.domain.update({ where: { id }, data: { isPrimary: true } });
  } else return NextResponse.json({ error: "unknown action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  const dom = id ? await prisma.domain.findUnique({ where: { id } }) : null;
  if (!dom || dom.tenantId !== user.tenantId) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.domain.delete({ where: { id: dom.id } });
  return NextResponse.json({ ok: true });
}
