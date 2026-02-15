import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

type Body = { checkoutKey?: string };

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const checkoutKey = String(body?.checkoutKey ?? "").trim();
  if (!checkoutKey) return json({ error: "Missing checkoutKey" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!appUrl || !paystackKey) {
    return json(
      { error: "Missing env vars (NEXT_PUBLIC_APP_URL / PAYSTACK_SECRET_KEY)" },
      { status: 500 }
    );
  }

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return json({ error: "User not found" }, { status: 404 });

  // ✅ Extract non-null values so TS stops complaining later
  const userEmail = user.email;
  const userDbId = user.id;

  // Load cart + items
  const cart = await prisma.cart.findUnique({
    where: { userId: userDbId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return json({ error: "Cart is empty" }, { status: 400 });
  }

  // validate + total
  let totalAmount = 0;
  for (const it of cart.items) {
    if (!it.product.active) {
      return json({ error: "Inactive product in cart" }, { status: 400 });
    }
    if (it.product.stock <= 0) {
      return json({ error: `Out of stock: ${it.product.name}` }, { status: 409 });
    }
    if (it.quantity > it.product.stock) {
      return json({ error: `Insufficient stock: ${it.product.name}` }, { status: 409 });
    }
    totalAmount += it.product.price * it.quantity;
  }

  // ✅ Idempotent: reuse same order/payment if checkoutKey already exists
  let order = await prisma.order.findUnique({
    where: { checkoutKey },
    include: { payment: true },
  });

  if (!order) {
    order = await prisma.order.create({
      data: {
        reference: randomUUID(), // internal order reference
        userId: userDbId,
        status: "PENDING",
        deliveryStatus: "PROCESSING",
        totalAmount,
        checkoutKey,
        checkoutStatus: "INITIATED",
        orderItems: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.product.price,
          })),
        },
      },
      include: { payment: true },
    });
  } else {
    if (order.status === "PAID") {
      return json({ error: "Order already paid", reference: order.reference }, { status: 409 });
    }
    if (order.userId !== userDbId) {
      return json({ error: "checkoutKey belongs to another user" }, { status: 403 });
    }
  }

  // ✅ From here, order is guaranteed non-null
  const orderId = order.id;
  const orderTotal = order.totalAmount;

  // Ensure payment exists
  let payment = order.payment;
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        provider: "PAYSTACK",
        reference: order.reference, // internal reference
        status: "INITIATED",
        paystackRef: randomUUID(), // paystack transaction reference
      },
    });
  }

  // ✅ If already initialized, reuse authorization URL (prevents duplicate reference errors)
  const existingAuthUrl =
    (payment.paystackPayload as any)?.data?.authorization_url ||
    (payment.paystackPayload as any)?.data?.authorizationUrl;

  if (existingAuthUrl) {
    return json({
      authorizationUrl: existingAuthUrl,
      reference: payment.paystackRef, // paystack reference
    });
  }

  // Ensure paystackRef exists
  let paystackRef = payment.paystackRef ?? randomUUID();
  if (!payment.paystackRef) {
    await prisma.payment.update({
      where: { orderId },
      data: { paystackRef },
    });
  }

  async function initPaystack(ref: string) {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail,
        amount: orderTotal, // kobo
        reference: ref,
        callback_url: `${appUrl}/checkout/verify?reference=${encodeURIComponent(paystackRef)}`,
        metadata: {
          orderId,
          userId: userDbId,
          checkoutKey,
          paystackRef: ref,
        },
      }),
    });

    return (await res.json().catch(() => null)) as any;
  }

  // First attempt
  let init = await initPaystack(paystackRef);

  // ✅ Paystack duplicate ref error is usually top-level `code`, not `data.code`
  if (!init?.status && init?.code === "duplicate_reference") {
    paystackRef = randomUUID();
    init = await initPaystack(paystackRef);
  }

  if (!init?.status || !init?.data?.authorization_url) {
    await prisma.order
      .update({
        where: { id: orderId },
        data: { checkoutStatus: "FAILED" },
      })
      .catch(() => {});

    return json({ error: "Paystack init failed", init }, { status: 500 });
  }

  // store payload + final paystackRef used
  await prisma.payment
    .update({
      where: { orderId },
      data: { paystackPayload: init, paystackRef },
    })
    .catch(() => {});

  return json({
    authorizationUrl: init.data.authorization_url,
    reference: paystackRef,
  });
}
