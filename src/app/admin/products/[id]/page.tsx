import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ProductForm from "@/components/admin/product-form";
import AdminShell from "../../_components/AdminShell";
import { Prisma } from "@prisma/client";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  if (Number.isNaN(productId)) notFound();

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  // ✅ capture non-null values so TS stops complaining inside server action
  const existingPrimaryImage = product.imageUrl;

  async function updateProduct(formData: FormData) {
    "use server";

    const imagesRaw = (formData.get("images") as string) || "[]";
    let images: string[] = [];

    try {
      const parsed = JSON.parse(imagesRaw);
      if (Array.isArray(parsed)) images = parsed.filter(Boolean);
    } catch {}

    const primary =
      (formData.get("imageUrl") as string) || images[0] || existingPrimaryImage;

    await prisma.product.update({
      where: { id: productId },
      data: {
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        description: formData.get("description") as string,
        price: Math.round(Number(formData.get("price")) * 100),
        stock: Number(formData.get("stock")),
        imageUrl: primary,

        // ✅ Prisma Json? needs Prisma.JsonNull, not JS null
        images: images.length
          ? (images as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,

        categoryId: Number(formData.get("categoryId")),
      },
    });

    redirect("/admin/products");
  }

  const existingImages =
    (Array.isArray(product.images)
      ? (product.images as unknown as string[])
      : null) ?? (product.imageUrl ? [product.imageUrl] : []);

  return (
    <AdminShell title="Edit Product">
      <ProductForm
        categories={categories}
        action={updateProduct}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          priceKobo: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
          images: existingImages,
          categoryId: product.categoryId,
        }}
        submitLabel="Update Product"
      />
    </AdminShell>
  );
}
