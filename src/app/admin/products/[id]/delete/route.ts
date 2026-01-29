import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(
  _: Request,
  { params }: { params: { id: string } }
) {
  await prisma.product.delete({
    where: { id: Number(params.id) },
  });

  return NextResponse.redirect(
    new URL('/admin/products', process.env.NEXT_PUBLIC_APP_URL)
  );
}
