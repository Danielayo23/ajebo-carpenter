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

  // Load user + address
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { address: true },
  });

  if (!user) return json({ error: "User not found" }, { status: 404 });

  if (!user.address) {
    return json(
      { error: "Missing delivery address. Please add an address before checkout." },
      { status: 400 }
    );
  }

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

  // Idempotent order by checkoutKey
  let order = await prisma.order.findUnique({
    where: { checkoutKey },
    include: { payment: true },
  });

  if (!order) {
    order = await prisma.order.create({
      data: {
        reference: randomUUID(),
        userId: userDbId,
        status: "PENDING",
        deliveryStatus: "PROCESSING",
        totalAmount,
        checkoutKey,
        checkoutStatus: "INITIATED",

        // ✅ snapshot address onto order
        shipFullName: user.address.fullName,
        shipPhone: user.address.phone,
        shipLine1: user.address.line1,
        shipLine2: user.address.line2,
        shipLandmark: user.address.landmark,
        shipCity: user.address.city,
        shipState: user.address.state,

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
      return json(
        { error: "Order already paid", reference: order.reference },
        { status: 409 }
      );
    }
    if (order.userId !== userDbId) {
      return json({ error: "checkoutKey belongs to another user" }, { status: 403 });
    }
  }

  const orderId = order.id;
  const orderTotal = order.totalAmount;

  // Ensure payment exists
  let payment = order.payment;
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        provider: "PAYSTACK",
        reference: order.reference,
        status: "INITIATED",
        paystackRef: randomUUID(),
      },
    });
  }

  // Reuse existing authorization_url if we have it
  const existingAuthUrl =
    (payment.paystackPayload as any)?.data?.authorization_url ||
    (payment.paystackPayload as any)?.data?.authorizationUrl;

  if (existingAuthUrl) {
    return json({
      authorizationUrl: existingAuthUrl,
      reference: payment.paystackRef,
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
        amount: orderTotal,
        reference: ref,
        callback_url: `${appUrl}/checkout/verify?reference=${encodeURIComponent(ref)}`,
        metadata: {
          orderId,
          userId: userDbId,
          checkoutKey,
          paystackRef: ref,

          // Nice display in Paystack dashboard
          custom_fields: [
            { display_name: "Order ID", variable_name: "order_id", value: String(orderId) },
            { display_name: "Order Ref", variable_name: "order_ref", value: order.reference },
            { display_name: "Customer Email", variable_name: "customer_email", value: userEmail },
            { display_name: "Delivery Address", variable_name: "delivery_address", value: `${order.shipLine1 ?? ""}${order.shipCity ? `, ${order.shipCity}` : ""}${order.shipState ? `, ${order.shipState}` : ""}` },
          ],
        },
      }),
    });

    return (await res.json().catch(() => null)) as any;
  }

  // First attempt
  let init = await initPaystack(paystackRef);

  // Retry once if duplicate reference
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