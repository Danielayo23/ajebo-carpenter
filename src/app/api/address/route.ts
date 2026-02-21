import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

type AddressPayload = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { address: true },
  });

  if (!user) return json({ ok: false, error: "User not found" }, { status: 404 });

  return json({ ok: true, address: user.address ?? null });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return json({ ok: false, error: "User not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as AddressPayload | null;
  if (!body) return json({ ok: false, error: "Invalid JSON body" }, { status: 400 });

  const fullName = clean(body.fullName);
  const phone = clean(body.phone);
  const line1 = clean(body.line1);
  const city = clean(body.city);
  const state = clean(body.state);

  const line2 = clean(body.line2) || null;
  const landmark = clean(body.landmark) || null;

  if (!fullName || !phone || !line1 || !city || !state) {
    return json(
      {
        ok: false,
        error:
          "Missing required fields: fullName, phone, line1, city, state (line2/landmark optional).",
      },
      { status: 400 }
    );
  }

  if (phone.length < 7) {
    return json({ ok: false, error: "Phone number looks too short." }, { status: 400 });
  }

  const address = await prisma.address.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      phone,
      line1,
      line2,
      landmark,
      city,
      state,
    },
    update: {
      fullName,
      phone,
      line1,
      line2,
      landmark,
      city,
      state,
    },
  });

  return json({ ok: true, address });
}