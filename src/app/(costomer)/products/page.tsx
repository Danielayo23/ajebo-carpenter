import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Search } from 'lucide-react';

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

/** Small, fast Levenshtein distance for fuzzy match */
function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1).fill(0);
  const v1 = new Array(b.length + 1).fill(0);

  for (let i = 0; i <= b.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,
        v0[j + 1] + 1,
        v0[j] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}

function normalizeQuery(q: string) {
  return q
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

function allowedDistance(q: string) {
  const n = q.length;
  if (n <= 4) return 1;
  if (n <= 7) return 2;
  return 3;
}

function isFuzzyNameMatch(productName: string, q: string) {
  const name = productName.toLowerCase();

  if (name.includes(q)) return true;

  const words = name.split(/\s+/).filter(Boolean);
  const maxD = allowedDistance(q);

  for (const w of words) {
    if (w.startsWith(q) || q.startsWith(w)) return true;

    const d = levenshtein(q, w);
    if (d <= maxD) return true;
  }

  return false;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; search?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const categorySlug = params.category?.trim() || '';
  const rawSearch = params.search?.trim() || '';
  const q = normalizeQuery(rawSearch);

  let usedFuzzyFallback = false;

  // Fetch categories for filter
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  // ---------- pass 1: normal search (NAME ONLY) ----------
  const productsStrict = await prisma.product.findMany({
    where: {
      active: true,
      ...(categorySlug && { category: { slug: categorySlug } }),
      ...(rawSearch && {
        name: { contains: rawSearch },
      }),
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  let products = productsStrict;

  // ---------- pass 2: fuzzy fallback (NAME ONLY) ----------
  if (q && productsStrict.length === 0) {
    const CANDIDATE_LIMIT = 400;

    const candidates = await prisma.product.findMany({
      where: {
        active: true,
        ...(categorySlug && { category: { slug: categorySlug } }),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: CANDIDATE_LIMIT,
    });

    const fuzzy = candidates.filter((p) => isFuzzyNameMatch(p.name, q));
    if (fuzzy.length > 0) {
      usedFuzzyFallback = true;
      products = fuzzy;
    } else {
      products = [];
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">
          Product Catalog
        </h1>
        <p className="mt-3 text-base text-gray-600 md:text-lg">
          Find Pieces that fit into every room
        </p>
      </section>

      {/* Filters & Search */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                !params.category
                  ? 'bg-[#04209d] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}${
                  params.search ? `&search=${encodeURIComponent(params.search)}` : ''
                }`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  params.category === cat.slug
                    ? 'bg-[#04209d] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Search */}
          <form action="/products" method="get" className="relative max-w-md">
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Search products..."
              className="w-full rounded-full border border-gray-300 bg-white py-2 pl-4 pr-10 text-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Search size={18} className="text-gray-400" />
            </button>
          </form>
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* Fuzzy hint */}
        {usedFuzzyFallback && rawSearch && (
          <div className="mb-6 text-center text-sm text-gray-500">
            Showing results similar to{' '}
            <span className="font-medium text-gray-700">"{rawSearch}"</span>
          </div>
        )}

        {products.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl bg-gray-50 p-10 text-center">
            <div className="text-lg font-semibold text-gray-900">
              No products found
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Try clearing your search or selecting a different category.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              {params.search && (
                <Link
                  href={
                    categorySlug
                      ? `/products?category=${encodeURIComponent(categorySlug)}`
                      : '/products'
                  }
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
                >
                  Clear search
                </Link>
              )}

              <Link
                href="/products"
                className="rounded-xl bg-[#04209d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                View all products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group block overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative h-64 w-full overflow-hidden bg-gray-100">
                  <Image
                    src={product.imageUrl || '/images/placeholder.jpg'}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                <div className="p-5">
                  <h3 className="text-base font-semibold text-gray-900 transition-colors group-hover:text-[#04209d]">
                    {product.name}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {product.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {formatNgnFromKobo(product.price)}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-[#04209d]">
                      <ArrowRight
                        size={16}
                        className="text-gray-600 transition-colors group-hover:text-white"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}