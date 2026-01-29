import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

type MergeBody = { items?: Array<{ productId: number; quantity: number }> };

async function getOrCreateDbUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      clerkUserId: userId,
      email: "unknown@local",
      role: "CUSTOMER",
    },
  });
}

export async function POST(req: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as MergeBody | null;
  const items = Array.isArray(body?.items) ? body!.items! : [];

  const cleaned = items
    .map((x) => ({
      productId: Number(x.productId),
      quantity: Math.max(1, Number(x.quantity ?? 1)),
    }))
    .filter((x) => Number.isFinite(x.productId) && x.productId > 0);

  if (cleaned.length === 0) return NextResponse.json({ ok: true });

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: { id: true },
  });

  // Merge by incrementing existing quantities
  await prisma.$transaction(
    cleaned.map((it) =>
      prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: it.productId } },
        update: { quantity: { increment: it.quantity } },
        create: { cartId: cart.id, productId: it.productId, quantity: it.quantity },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
