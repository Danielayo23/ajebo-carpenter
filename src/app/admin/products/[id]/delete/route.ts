import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-only";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await context.params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  await prisma.product.delete({ where: { id: productId } });

  // After deleting, send them back to products list (works with <form method="post">)
  return NextResponse.redirect(new URL("/admin/products", req.url), 303);
}
