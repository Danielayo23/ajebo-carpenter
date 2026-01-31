import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET() {
  const user = await syncUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      cartitem: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              imageUrl: true,
              stock: true,
              active: true,
              category: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  const items =
    cart?.cartitem
      .filter((it) => it.product?.active)
      .map((it) => ({
        id: it.productId,
        productId: it.productId,
        name: it.product.name,
        slug: it.product.slug,
        price: it.product.price,
        quantity: it.quantity,
        image: it.product.imageUrl,
        categoryName: it.product.category?.name ?? "",
        stock: it.product.stock,
      })) ?? [];

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return json({ items, subtotal });
}

export async function POST(req: Request) {
  const user = await syncUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const body = (await req.json().catch(() => null)) as
    | { productId?: number; quantity?: number }
    | null;

  const productId = Number(body?.productId);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));

  if (!Number.isFinite(productId) || productId < 1) {
    return json({ error: "Invalid productId" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, active: true },
  });

  if (!product || !product.active) return json({ error: "Product not found" }, { status: 404 });
  if (product.stock <= 0) return json({ error: "Out of stock" }, { status: 409 });

  const clampedQty = Math.min(quantity, product.stock);

  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id, updatedAt: now },
    update: { updatedAt: now },
    select: { id: true },
  });

  await prisma.cartitem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: clampedQty, updatedAt: now },
    update: {
      quantity: { increment: clampedQty },
      updatedAt: now,
    },
  });

  const updated = await prisma.cartitem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
    select: { quantity: true },
  });

  if (updated?.quantity && updated.quantity > product.stock) {
    await prisma.cartitem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity: product.stock, updatedAt: now },
    });
  }

  return json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = await syncUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const body = (await req.json().catch(() => null)) as
    | { productId?: number; quantity?: number }
    | null;

  const productId = Number(body?.productId);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));

  if (!Number.isFinite(productId) || productId < 1) {
    return json({ error: "Invalid productId" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!cart) return json({ ok: true });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, active: true },
  });
  if (!product || !product.active) return json({ error: "Product not found" }, { status: 404 });

  const clamped = Math.min(quantity, Math.max(0, product.stock));

  if (clamped <= 0) {
    await prisma.cartitem
      .delete({ where: { cartId_productId: { cartId: cart.id, productId } } })
      .catch(() => {});
    return json({ ok: true });
  }

  await prisma.cartitem.update({
    where: { cartId_productId: { cartId: cart.id, productId } },
    data: { quantity: clamped, updatedAt: now },
  });

  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: now },
  });

  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await syncUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { productId?: number }
    | null;

  const productId = Number(body?.productId);
  if (!Number.isFinite(productId) || productId < 1) {
    return json({ error: "Invalid productId" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!cart) return json({ ok: true });

  await prisma.cartitem
    .delete({ where: { cartId_productId: { cartId: cart.id, productId } } })
    .catch(() => {});

  await prisma.cart.update({
    where: { id: cart.id },
    data: { updatedAt: new Date() },
  });

  return json({ ok: true });
}
