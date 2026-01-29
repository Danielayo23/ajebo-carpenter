/* =========================================================
   FILE: src/app/api/hero-slideshow/route.ts
   ========================================================= */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Fisher–Yates shuffle (in-place)
 */
function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET() {
  try {
    const LIMIT = 10;

    // 1. Get all usable product images
    const products = await prisma.product.findMany({
      where: {
        active: true,
        imageUrl: {
          not: "",
        },
      },
      select: {
        imageUrl: true,
      },
    });

    let images = products
      .map((p) => p.imageUrl)
      .filter(Boolean) as string[];

    // 2. Shuffle + limit
    if (images.length > 0) {
      shuffle(images);
      images = images.slice(0, LIMIT);
    }

    // 3. Fallback to Hero image
    if (images.length === 0) {
      const hero = await prisma.hero.findFirst({
        where: { active: true },
        select: { backgroundImageUrl: true },
      });

      if (hero?.backgroundImageUrl) {
        images = [hero.backgroundImageUrl];
      }
    }

    return NextResponse.json(
      { images },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Hero slideshow error:", error);

    return NextResponse.json(
      { images: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
