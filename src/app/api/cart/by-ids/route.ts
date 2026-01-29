import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { ids?: number[] } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids!.map(Number).filter((n) => n > 0) : [];

  if (ids.length === 0) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, name: true, slug: true, price: true, imageUrl: true },
  });

  return NextResponse.json({ products });
}
