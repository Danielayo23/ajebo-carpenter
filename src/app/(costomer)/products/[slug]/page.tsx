import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductGallery from "./_components/ProductGallery";
import AddToCartSection from "./_components/AddToCartSection";
import Link from "next/link";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, active: true },
    include: { category: true },
  });

  if (!product) notFound();

  const extra =
    Array.isArray(product.images) ? (product.images as unknown as string[]) : [];

  const images = [product.imageUrl, ...extra].filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      {/* Page Title */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">
          Product
        </h1>
      </section>

      {/* Product Content */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
          {/* Main Product Info */}
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            {/* Gallery */}
            <ProductGallery images={images} alt={product.name} />

            {/* Product Details */}
            <div className="mt-8 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {product.name}
              </h2>

              <p className="text-sm leading-relaxed text-gray-500">
                {product.description}
              </p>

              {/* Add to Cart Section with Quantity Selector */}
              <AddToCartSection
                productId={product.id}
                price={formatNgnFromKobo(product.price)}
                stock={product.stock}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}