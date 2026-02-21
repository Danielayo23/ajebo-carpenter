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

  // ✅ Load user + saved address
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { address: true },
  });

  if (!user) return json({ error: "User not found" }, { status: 404 });

  const userEmail = user.email;
  const userDbId = user.id;

  // ✅ Enforce address exists
  const ship = user.address;
  if (!ship) {
    return json({ error: "Please add a delivery address before checkout." }, { status: 400 });
  }
  if (!ship.fullName || !ship.phone || !ship.line1 || !ship.city || !ship.state) {
    return json(
      { error: "Your saved address is incomplete. Please edit and save it again." },
      { status: 400 }
    );
  }

  // Load cart
  const cart = await prisma.cart.findUnique({
    where: { userId: userDbId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return json({ error: "Cart is empty" }, { status: 400 });
  }

  // Validate + total
  let totalAmount = 0;

  const itemSummary = cart.items.map((it) => ({
    name: it.product.name,
    qty: it.quantity,
    price: it.product.price,
  }));

  for (const it of cart.items) {
    if (!it.product.active) return json({ error: "Inactive product in cart" }, { status: 400 });
    if (it.product.stock <= 0) return json({ error: `Out of stock: ${it.product.name}` }, { status: 409 });
    if (it.quantity > it.product.stock) return json({ error: `Insufficient stock: ${it.product.name}` }, { status: 409 });
    totalAmount += it.product.price * it.quantity;
  }

  // ✅ Get existing order (idempotent)
  const existing = await prisma.order.findUnique({
    where: { checkoutKey },
    include: { payment: true },
  });

  // If exists, validate it
  if (existing) {
    if (existing.status === "PAID") {
      return json({ error: "Order already paid", reference: existing.reference }, { status: 409 });
    }
    if (existing.userId !== userDbId) {
      return json({ error: "checkoutKey belongs to another user" }, { status: 403 });
    }
  }

  // ✅ Create order only if missing
  const order =
    existing ??
    (await prisma.order.create({
      data: {
        reference: randomUUID(),
        userId: userDbId,
        status: "PENDING",
        deliveryStatus: "PROCESSING",
        totalAmount,
        checkoutKey,
        checkoutStatus: "INITIATED",

        // Snapshot shipping into order (must exist in schema)
        shipFullName: ship.fullName,
        shipPhone: ship.phone,
        shipLine1: ship.line1,
        shipLine2: ship.line2,
        shipLandmark: ship.landmark,
        shipCity: ship.city,
        shipState: ship.state,

        orderItems: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.product.price,
          })),
        },
      },
      include: { payment: true },
    }));

  // ✅ Now TS knows order is NON-NULL
  const orderId = order.id;
  const orderTotal = order.totalAmount;
  const orderInternalRef = order.reference;

  // Ensure payment exists
  let payment = order.payment;
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        provider: "PAYSTACK",
        reference: orderInternalRef,
        status: "INITIATED",
        paystackRef: randomUUID(),
      },
    });
  }

  // If already initialized, reuse auth url
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
          internalRef: orderInternalRef,
          checkoutKey,
          paystackRef: ref,
          customerEmail: userEmail,
          shipping: {
            fullName: ship.fullName,
            phone: ship.phone,
            line1: ship.line1,
            line2: ship.line2,
            landmark: ship.landmark,
            city: ship.city,
            state: ship.state,
          },
          items: itemSummary.map((x) => ({ name: x.name, qty: x.qty })),
        },

        custom_fields: [
          { display_name: "Order ID", variable_name: "order_id", value: String(orderId) },
          // ✅ IMPORTANT: DO NOT USE order.reference here
          { display_name: "Internal Ref", variable_name: "internal_ref", value: orderInternalRef },
          { display_name: "Ship Name", variable_name: "ship_name", value: ship.fullName },
          { display_name: "Ship Phone", variable_name: "ship_phone", value: ship.phone },
          { display_name: "Ship Address", variable_name: "ship_address", value: ship.line1 },
          { display_name: "Ship City", variable_name: "ship_city", value: ship.city },
          { display_name: "Ship State", variable_name: "ship_state", value: ship.state },
        ],
      }),
    });

    return (await res.json().catch(() => null)) as any;
  }

  // First attempt
  let init = await initPaystack(paystackRef);

  // Duplicate reference? retry once
  if (!init?.status && init?.code === "duplicate_reference") {
    paystackRef = randomUUID();
    init = await initPaystack(paystackRef);
  }

  if (!init?.status || !init?.data?.authorization_url) {
    await prisma.order
      .update({ where: { id: orderId }, data: { checkoutStatus: "FAILED" } })
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