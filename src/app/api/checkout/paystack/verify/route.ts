import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type UiStatus = "success" | "failed" | "pending";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

function mapPaystackStatusToUi(status: unknown): UiStatus {
  const s = String(status ?? "").toLowerCase();
  if (s === "success") return "success";
  if (s === "failed") return "failed";
  return "pending";
}

export async function GET(req: Request) {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) {
    return json(
      { ok: false, status: "failed", message: "Missing PAYSTACK_SECRET_KEY" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const ref = (searchParams.get("reference") ?? searchParams.get("trxref") ?? "").trim();
  if (!ref) {
    return json(
      { ok: false, status: "failed", message: "Missing reference" },
      { status: 400 }
    );
  }

  // 1) Verify with Paystack (source of truth)
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } }
  );

  const verify = (await verifyRes.json().catch(() => null)) as any;

  if (!verify?.status) {
    return json(
      { ok: false, status: "failed", message: "Verification request failed", verify },
      { status: 500 }
    );
  }

  const uiStatus = mapPaystackStatusToUi(verify?.data?.status);

  // 2) Try to update DB, BUT DB problems must not turn Paystack success into "failed"
  try {
    const payment =
      (await prisma.payment.findFirst({
        where: { paystackRef: ref },
        include: { order: { include: { orderItems: true } } },
      })) ||
      (await prisma.payment.findFirst({
        where: { reference: ref }, // old fallback
        include: { order: { include: { orderItems: true } } },
      }));

    // If we can't match it in DB, still return Paystack truth
    if (!payment?.order) {
      return json({ ok: true, status: uiStatus, reference: ref });
    }

    const order = payment.order;

    if (uiStatus === "success") {
      // Always mark payment success (idempotent)
      // Only do stock/cart once (when moving PENDING -> PAID)
      const shouldFinalize = order.status !== "PAID";

      const ops: any[] = [];

      ops.push(
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            paidAt: payment.paidAt ?? new Date(),
            paystackPayload: verify,
          },
        })
      );

      if (shouldFinalize) {
        ops.push(
          prisma.order.update({
            where: { id: order.id },
            data: { status: "PAID", checkoutStatus: "SUCCESS" },
          })
        );

        // decrement stock once
        for (const it of order.orderItems) {
          ops.push(
            prisma.product.update({
              where: { id: it.productId },
              data: { stock: { decrement: it.quantity } },
            })
          );
        }

        // clear cart once
        const cart = await prisma.cart.findUnique({
          where: { userId: order.userId },
          select: { id: true },
        });

        if (cart) {
          ops.push(prisma.cartItem.deleteMany({ where: { cartId: cart.id } }));
        }
      }

      await prisma.$transaction(ops);
    } else if (uiStatus === "failed") {
      // Paystack says failed -> mark failed (but never downgrade a paid order)
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", paystackPayload: verify },
        }),
        ...(order.status !== "PAID"
          ? [
              prisma.order.update({
                where: { id: order.id },
                data: { checkoutStatus: "FAILED" },
              }),
            ]
          : []),
      ]);
    } else {
      // uiStatus === "pending"
      // DO NOT mark order/payment failed.
      // Optional: store payload for troubleshooting.
      await prisma.payment.update({
        where: { id: payment.id },
        data: { paystackPayload: verify },
      });
    }
  } catch (err) {
    // If Paystack says success/pending but DB is delayed, don't show failed.
    if (uiStatus !== "failed") {
      return json({
        ok: false,
        status: "pending",
        message: "Confirming payment… (DB delay)",
        reference: ref,
      });
    }

    return json(
      { ok: false, status: "failed", message: "DB error during verification", reference: ref },
      { status: 500 }
    );
  }

  return json({ ok: true, status: uiStatus, reference: ref });
}
