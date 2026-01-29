import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-only";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;
  const productId = Number(id);

  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  // Redirect back to products list
  return NextResponse.redirect(new URL("/admin/products", request.url));
}
