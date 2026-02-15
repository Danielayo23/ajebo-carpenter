import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductGallery from "./_components/ProductGallery";
import AddToCartSection from "./_components/AddToCartSection";
import CustomRequestBox from "./_components/CustomRequestBox";

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
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">Product</h1>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            <ProductGallery images={images} alt={product.name} />

            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>

              {/* Description + Note box side-by-side on desktop */}
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-6">
                  <p className="text-sm leading-relaxed text-gray-600">
                    {product.description}
                  </p>
                </div>

                <CustomRequestBox productName={product.name} productSlug={product.slug} />
              </div>

              <div className="mt-6">
                <AddToCartSection
                  productId={product.id}
                  price={formatNgnFromKobo(product.price)}
                  stock={product.stock}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
