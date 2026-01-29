import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProductForm from "@/components/admin/product-form";
import AdminShell from "../../_components/AdminShell";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  async function createProduct(formData: FormData) {
    "use server";

    const imagesRaw = (formData.get("images") as string) || "[]";
    let images: string[] = [];
    try {
      const parsed = JSON.parse(imagesRaw);
      if (Array.isArray(parsed)) images = parsed.filter(Boolean);
    } catch {}

    const primary = (formData.get("imageUrl") as string) || images[0] || "";

    await prisma.product.create({
      data: {
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        description: formData.get("description") as string,
        price: Math.round(Number(formData.get("price")) * 100),
        stock: Number(formData.get("stock")),
        imageUrl: primary,
        images: images.length ? images : undefined,
        categoryId: Number(formData.get("categoryId")),
        active: true,
      },
    });

    redirect("/admin/products");
  }

  return (
    <AdminShell title="Add Product">
      <ProductForm
        categories={categories}
        action={createProduct}
        submitLabel="Publish Product"
      />
    </AdminShell>
  );
}
