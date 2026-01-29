/* =========================================================
   FILE: src/app/api/admin/orders/export/route.ts
   (CSV download of filtered list)
   ========================================================= */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-only";

type Filter = "all" | "shipping" | "completed" | "cancelled";

function parseFilter(v: string | null): Filter {
  if (v === "shipping" || v === "completed" || v === "cancelled") return v;
  return "all";
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const filter = parseFilter(searchParams.get("filter"));
  const q = (searchParams.get("q") ?? "").trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filter === "cancelled") where.status = "CANCELLED";
  else if (filter === "completed") where.deliveryStatus = "DELIVERED";
  else if (filter === "shipping") where.deliveryStatus = { in: ["PROCESSING", "DISPATCHED"] };

  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { user: { email: { contains: q } } },
      { items: { some: { product: { name: { contains: q } } } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      deliveryStatus: true,
      totalAmount: true,
      createdAt: true,
      user: { select: { email: true } },
      items: {
        select: {
          quantity: true,
          product: { select: { name: true } },
        },
        take: 1,
      },
    },
  });

  const header = [
    "order_id",
    "reference",
    "customer_email",
    "product",
    "quantity",
    "payment_status",
    "delivery_status",
    "total_naira",
    "created_at",
  ];

  const rows = orders.map((o) => {
    const firstItem = o.items?.[0];
    const product = firstItem?.product?.name ?? "";
    const quantity = firstItem?.quantity ?? 0;

    const totalNaira = (o.totalAmount / 100).toFixed(2);

    return [
      o.id,
      o.reference,
      o.user.email,
      product,
      quantity,
      o.status,
      o.deliveryStatus,
      totalNaira,
      o.createdAt.toISOString(),
    ].map(csvEscape);
  });

  const csv = [header.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `orders_${filter}_${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
