import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed hero
  await prisma.hero.createMany({
    data: [
      {
        backgroundImageUrl: "/images/hero-default.jpg",
        active: true,
      },
    ],
    skipDuplicates: true,
  });

  // Seed categories (ORDER MATTERS)
  await prisma.category.createMany({
    data: [
      { name: "Sitting room", slug: "sitting-room", sortOrder: 1 },
      { name: "Bedroom", slug: "bedroom", sortOrder: 2 },
      { name: "Kitchen", slug: "kitchen", sortOrder: 3 },
      { name: "Office", slug: "office", sortOrder: 4 },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
