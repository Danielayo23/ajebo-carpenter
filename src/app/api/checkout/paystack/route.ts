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
    return json({ error: "Missing env vars (NEXT_PUBLIC_APP_URL / PAYSTACK_SECRET_KEY)" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { address: true },
  });
  if (!user) return json({ error: "User not found" }, { status: 404 });

  // ✅ must have address before checkout
  if (!user.address) {
    return json(
      { error: "Delivery address required. Please add your address before payment." },
      { status: 409 }
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
    if (!it.product.active) return json({ error: "Inactive product in cart" }, { status: 400 });
    if (it.product.stock <= 0) return json({ error: `Out of stock: ${it.product.name}` }, { status: 409 });
    if (it.quantity > it.product.stock) return json({ error: `Insufficient stock: ${it.product.name}` }, { status: 409 });
    totalAmount += it.product.price * it.quantity;
  }

  // Idempotent: reuse same order/payment if checkoutKey exists
  let order = await prisma.order.findUnique({
    where: { checkoutKey },
    include: { payment: true },
  });

  const ship = user.address;

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

        // ✅ snapshot shipping onto the order (so admin can always see it)
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
    });
  } else {
    if (order.status === "PAID") {
      return json({ error: "Order already paid", reference: order.reference }, { status: 409 });
    }
    if (order.userId !== userDbId) {
      return json({ error: "checkoutKey belongs to another user" }, { status: 403 });
    }

    // If order exists but shipping not present yet, update it
    await prisma.order.update({
      where: { id: order.id },
      data: {
        shipFullName: (order as any).shipFullName ?? ship.fullName,
        shipPhone: (order as any).shipPhone ?? ship.phone,
        shipLine1: (order as any).shipLine1 ?? ship.line1,
        shipLine2: (order as any).shipLine2 ?? ship.line2,
        shipLandmark: (order as any).shipLandmark ?? ship.landmark,
        shipCity: (order as any).shipCity ?? ship.city,
        shipState: (order as any).shipState ?? ship.state,
      },
    }).catch(() => {});
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

  // reuse auth url if already initialized
  const existingAuthUrl =
    (payment.paystackPayload as any)?.data?.authorization_url ||
    (payment.paystackPayload as any)?.data?.authorizationUrl;

  if (existingAuthUrl) {
    return json({ authorizationUrl: existingAuthUrl, reference: payment.paystackRef });
  }

  let paystackRef = payment.paystackRef ?? randomUUID();
  if (!payment.paystackRef) {
    await prisma.payment.update({ where: { orderId }, data: { paystackRef } });
  }

  const itemsForMeta = cart.items.map((it) => ({
    name: it.product.name,
    quantity: it.quantity,
    unit_price_kobo: it.product.price,
    line_total_kobo: it.product.price * it.quantity,
  }));

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
        callback_url: `${appUrl}/checkout/verify?reference=${encodeURIComponent(ref)}`,
        metadata: {
          orderId,
          checkoutKey,
          paystackRef: ref,
          customerEmail: userEmail,

          // ✅ these show on Paystack dashboard (and in some notifications)
          custom_fields: [
            { display_name: "Order ID", variable_name: "order_id", value: String(orderId) },
            { display_name: "Internal Ref", variable_name: "internal_ref", value: order.reference },
            { display_name: "Ship Name", variable_name: "ship_name", value: ship.fullName },
            { display_name: "Ship Phone", variable_name: "ship_phone", value: ship.phone },
            { display_name: "Ship Address", variable_name: "ship_address", value: ship.line1 },
            { display_name: "City", variable_name: "ship_city", value: ship.city },
            { display_name: "State", variable_name: "ship_state", value: ship.state },
          ],
          shipping: {
            fullName: ship.fullName,
            phone: ship.phone,
            line1: ship.line1,
            line2: ship.line2,
            landmark: ship.landmark,
            city: ship.city,
            state: ship.state,
          },
          items: itemsForMeta,
        },
      }),
    });

    return (await res.json().catch(() => null)) as any;
  }

  let init = await initPaystack(paystackRef);

  if (!init?.status && init?.code === "duplicate_reference") {
    paystackRef = randomUUID();
    init = await initPaystack(paystackRef);
  }

  if (!init?.status || !init?.data?.authorization_url) {
    await prisma.order.update({ where: { id: orderId }, data: { checkoutStatus: "FAILED" } }).catch(() => {});
    return json({ error: "Paystack init failed", init }, { status: 500 });
  }

  await prisma.payment.update({
    where: { orderId },
    data: { paystackPayload: init, paystackRef },
  }).catch(() => {});

  return json({ authorizationUrl: init.data.authorization_url, reference: paystackRef });
}