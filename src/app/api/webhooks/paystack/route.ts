import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export async function POST(req: Request) {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) return json({ error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const hash = crypto
    .createHmac("sha512", paystackKey)
    .update(body)
    .digest("hex");

  if (!signature || hash !== signature) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  const evt = String(event?.event ?? "");
  const paystackRef = String(event?.data?.reference ?? "").trim();
  if (!paystackRef) return json({ ok: true });

  const shouldHandle =
    evt === "charge.success" ||
    evt === "transaction.success" ||
    evt === "charge.failed" ||
    evt === "transaction.failed";

  if (!shouldHandle) return json({ ok: true });

  // Verify with Paystack (source of truth)
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } }
  );

  const verify = (await verifyRes.json().catch(() => null)) as any;

  // If verify is down, let Paystack retry
  if (!verify?.status) {
    return json({ ok: true });
  }

  const paystackStatus = String(verify?.data?.status ?? "");
  const verifiedSuccess = paystackStatus === "success";
  const verifiedFailed = paystackStatus === "failed" || paystackStatus === "abandoned";

  await prisma.$transaction(async (tx) => {
    const payment =
      (await tx.payment.findFirst({
        where: { paystackRef },
        include: { order: { include: { orderItems: true } } },
      })) ||
      (await tx.payment.findFirst({
        where: { reference: paystackRef },
        include: { order: { include: { orderItems: true } } },
      }));

    if (!payment?.order) return;

    const order = payment.order;

    if (verifiedSuccess) {
      // Always mark payment success (idempotent)
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          paidAt: payment.paidAt ?? new Date(),
          paystackRef,
          paystackPayload: verify,
        },
      });

      // Only finalize once
      if (order.status !== "PAID") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID", checkoutStatus: "SUCCESS" },
        });

        for (const it of order.orderItems) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.quantity } },
          });
        }

        const cart = await tx.cart.findUnique({
          where: { userId: order.userId },
          select: { id: true },
        });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      return;
    }

    if (verifiedFailed) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          paystackRef,
          paystackPayload: verify,
        },
      });

      if (order.status !== "PAID") {
        await tx.order.update({
          where: { id: order.id },
          data: { checkoutStatus: "FAILED" },
        });
      }

      return;
    }

    // Pending: keep as-is, just store payload
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paystackPayload: verify,
        paystackRef,
      },
    });
  });

  return json({ ok: true });
}