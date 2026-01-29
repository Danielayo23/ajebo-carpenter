import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          imageUrl: true,
          name: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl lg:text-6xl">
          Shop by category
        </h1>
        <p className="mt-3 text-base text-gray-600 md:text-lg">
          Find pieces that fit into every room
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {categories.map((category) => {
            const image = category.products?.[0]?.imageUrl ?? "";

            return (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative overflow-hidden rounded-3xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="relative h-64 w-full bg-gray-100 sm:h-80 lg:h-96">
                  {image ? (
                    <Image
                      src={image}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/80" />

                  <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
                    <span className="inline-block rounded-full bg-[#04209d] px-6 py-2.5 text-sm font-semibold text-white shadow-xl transition-all duration-300 group-hover:bg-[#0530cc] group-hover:px-8 sm:text-base">
                      {category.name}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

