import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const hero = await prisma.hero.findFirst({
    where: { active: true },
    orderBy: { id: "desc" },
  });

  return NextResponse.json({
    backgroundImageUrl: hero?.backgroundImageUrl ?? "",
  });
}
