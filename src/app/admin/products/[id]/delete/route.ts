import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-only";

export const dynamic = "force-dynamic";

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

  // ✅ Archive (soft delete) instead of hard delete
  await prisma.product.update({
    where: { id: productId },
    data: { active: false },
  });

  // Redirect back to products list
  return NextResponse.redirect(new URL("/admin/products", request.url));
}