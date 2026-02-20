import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendAdminOrderEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

export async function POST(req: Request) {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey) return json({ error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const hash = crypto.createHmac("sha512", paystackKey).update(body).digest("hex");
  if (!signature || hash !== signature) return json({ error: "Invalid signature" }, { status: 401 });

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

  // Always verify with Paystack (source of truth)
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } }
  );

  const verify = (await verifyRes.json().catch(() => null)) as any;
  if (!verify?.status) {
    // Paystack will retry webhook later
    return json({ ok: true });
  }

  const paystackStatus = String(verify?.data?.status ?? ""); // success | failed | abandoned | pending
  const verifiedSuccess = paystackStatus === "success";
  const verifiedFailed = paystackStatus === "failed" || paystackStatus === "abandoned";

  let emailPayload:
    | {
        to: string;
        subject: string;
        text: string;
        html: string;
      }
    | null = null;

  await prisma.$transaction(async (tx) => {
    const payment =
      (await tx.payment.findFirst({
        where: { paystackRef },
        include: {
          order: {
            include: {
              user: true,
              orderItems: { include: { product: true } },
            },
          },
        },
      })) ||
      (await tx.payment.findFirst({
        where: { reference: paystackRef },
        include: {
          order: {
            include: {
              user: true,
              orderItems: { include: { product: true } },
            },
          },
        },
      }));

    if (!payment?.order) return;

    const order = payment.order;

    if (verifiedSuccess) {
      // mark payment row success (idempotent)
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          paidAt: payment.paidAt ?? new Date(),
          paystackRef,
          paystackPayload: verify,
        },
      });

      // finalize once
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
        if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      // Prepare admin email (send after tx)
      const adminTo = process.env.ADMIN_EMAIL || "info@ajebocarpenter.com";

      const ship = {
        fullName: (order as any).shipFullName ?? "",
        phone: (order as any).shipPhone ?? "",
        line1: (order as any).shipLine1 ?? "",
        line2: (order as any).shipLine2 ?? "",
        landmark: (order as any).shipLandmark ?? "",
        city: (order as any).shipCity ?? "",
        state: (order as any).shipState ?? "",
      };

      const itemsLines = order.orderItems
        .map((it) => {
          const unit = it.price ?? it.product.price;
          return `- ${it.product.name} x${it.quantity} (${formatNgnFromKobo(unit)})`;
        })
        .join("\n");

      const subject = `New Paid Order #${order.id} (${formatNgnFromKobo(order.totalAmount)})`;

      const text = `A payment has been confirmed.

Order ID: ${order.id}
Internal Ref: ${order.reference}
Paystack Ref: ${paystackRef}
Customer: ${order.user.email}

Items:
${itemsLines}

Total: ${formatNgnFromKobo(order.totalAmount)}

Shipping:
${ship.fullName}
${ship.phone}
${ship.line1}${ship.line2 ? `, ${ship.line2}` : ""}
${ship.landmark ? `Landmark: ${ship.landmark}\n` : ""}${ship.city}, ${ship.state}
`;

      const htmlItems = order.orderItems
        .map((it) => {
          const unit = it.price ?? it.product.price;
          return `<li><b>${it.product.name}</b> x${it.quantity} — ${formatNgnFromKobo(unit)}</li>`;
        })
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; line-height:1.5">
          <h2 style="margin:0 0 12px">New Paid Order #${order.id}</h2>
          <p style="margin:0 0 6px"><b>Total:</b> ${formatNgnFromKobo(order.totalAmount)}</p>
          <p style="margin:0 0 6px"><b>Customer:</b> ${order.user.email}</p>
          <p style="margin:0 0 6px"><b>Internal Ref:</b> ${order.reference}</p>
          <p style="margin:0 0 12px"><b>Paystack Ref:</b> ${paystackRef}</p>

          <h3 style="margin:16px 0 8px">Items</h3>
          <ul style="margin:0 0 12px; padding-left:18px">${htmlItems}</ul>

          <h3 style="margin:16px 0 8px">Shipping</h3>
          <div style="background:#f5f5f5; padding:12px; border-radius:10px">
            <div><b>${ship.fullName}</b></div>
            <div>${ship.phone}</div>
            <div>${ship.line1}${ship.line2 ? `, ${ship.line2}` : ""}</div>
            ${ship.landmark ? `<div>Landmark: ${ship.landmark}</div>` : ""}
            <div>${ship.city}, ${ship.state}</div>
          </div>
        </div>
      `;

      emailPayload = { to: adminTo, subject, text, html };
      return;
    }

    if (verifiedFailed) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", paystackRef, paystackPayload: verify },
      });

      if (order.status !== "PAID") {
        await tx.order.update({
          where: { id: order.id },
          data: { checkoutStatus: "FAILED" },
        });
      }
      return;
    }

    // pending: store payload only
    await tx.payment.update({
      where: { id: payment.id },
      data: { paystackPayload: verify, paystackRef },
    });
  });

  // Send email after DB commit
  if (emailPayload) {
    await sendAdminOrderEmail(emailPayload).catch(() => {});
  }

  return json({ ok: true });
}