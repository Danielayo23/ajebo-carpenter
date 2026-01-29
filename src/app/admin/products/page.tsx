import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminShell from "../_components/AdminShell";
import ProductsRowActions from "./_components/ProductsRowActions";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export default async function ProductsPage() {
  const [products, totalProducts, activeProducts] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
  ]);

  const outOfStock = products.filter((p) => p.stock === 0).length;

  async function deleteProduct(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id || Number.isNaN(id)) return;

    // If you have FK constraints, deleting order items referencing product may fail.
    // For now we only delete the product record.
    await prisma.product.delete({ where: { id } });
  }

  return (
    <AdminShell title="Products">
      <div className="space-y-5">
        {/* Stats Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Total Products
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {totalProducts.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Active Products
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {activeProducts.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Out of Stock
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">{outOfStock}</div>
          </div>
        </section>

        {/* Products Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Products</h2>
              <p className="mt-1 text-sm text-gray-500">Manage your product inventory</p>
            </div>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#04209d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#03185a]"
            >
              <span>+ Add Product</span>
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td className="px-6 py-16 text-center text-sm text-gray-500" colSpan={6}>
                      No products yet. Add your first product to get started.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {product.imageUrl ? (
                              // next/image is nicer later; keep <img> for now
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <span className="text-xs">No image</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            <div className="truncate text-xs text-gray-500">{product.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800">{product.category?.name || "-"}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className={`text-sm font-semibold ${
                            product.stock === 0
                              ? "text-red-600"
                              : product.stock < 10
                              ? "text-yellow-600"
                              : "text-gray-900"
                          }`}
                        >
                          {product.stock}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatNgnFromKobo(product.price)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {product.active ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <ProductsRowActions
                            productId={product.id}
                            onDelete={deleteProduct}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
