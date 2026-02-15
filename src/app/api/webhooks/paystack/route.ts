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

  // Only react to the important ones (you can add more later)
  const shouldHandle =
    evt === "charge.success" ||
    evt === "transaction.success" ||
    evt === "charge.failed" ||
    evt === "transaction.failed";

  if (!shouldHandle) return json({ ok: true });

  // Always verify with Paystack (source of truth)
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } }
  );

  const verify = (await verifyRes.json().catch(() => null)) as any;

  // If Paystack verify is down, don't break the webhook (Paystack will retry)
  if (!verify?.status) {
    return json({ ok: true });
  }

  const paystackStatus = String(verify?.data?.status ?? ""); // success | failed | abandoned | pending
  const verifiedSuccess = paystackStatus === "success";
  const verifiedFailed = paystackStatus === "failed" || paystackStatus === "abandoned";

  await prisma.$transaction(async (tx) => {
    const payment =
      (await tx.payment.findFirst({
        where: { paystackRef }, // ✅ new flow
        include: { order: { include: { orderItems: true } } },
      })) ||
      (await tx.payment.findFirst({
        where: { reference: paystackRef }, // fallback
        include: { order: { include: { orderItems: true } } },
      }));

    if (!payment?.order) return;

    const order = payment.order;

    // ✅ If success, mark paid (idempotent)
    if (verifiedSuccess) {
      // Always ensure payment row is marked success
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          paidAt: payment.paidAt ?? new Date(),
          paystackRef, // keep in sync
          paystackPayload: verify,
        },
      });

      // Only do stock/cart/order transitions once
      if (order.status !== "PAID") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID", checkoutStatus: "SUCCESS" },
        });

        // reduce stock once
        for (const it of order.orderItems) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.quantity } },
          });
        }

        // clear cart once
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

    // ✅ Only mark FAILED when Paystack verify says failed/abandoned
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

    // Otherwise: pending — do NOT mark failed.
    // Leave as-is so verify page can refresh and webhook retries can settle it.
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        // keep status as INITIATED/PENDING if you have it, or just store payload:
        paystackPayload: verify,
        paystackRef,
      },
    });
  });

  return json({ ok: true });
}
