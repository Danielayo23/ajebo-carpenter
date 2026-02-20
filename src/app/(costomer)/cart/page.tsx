"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CartItem from "./_components/CartItem";

type CartRow = {
  id: number; // productId
  productId: number;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image: string;
  categoryName: string;
  stock: number;
};

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export default function CartPage() {
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/cart")}`;
        return;
      }
      const data = (await res.json()) as { items?: CartRow[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const onUpdateQuantity = async (productId: number, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );

    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    }).catch(() => {});

    load();
  };

  const onRemove = async (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));

    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">Cart</h1>
        <p className="mt-3 text-base text-gray-600 md:text-lg">
          Review your items before checkout
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
            Loading your cart…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 px-6 py-12 text-center">
            <div className="text-lg font-semibold text-gray-900">Your cart is empty</div>
            <p className="mt-2 text-sm text-gray-600">
              Browse the catalog and add something you like.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              Shop products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {items.map((i) => (
                <CartItem
                  key={i.productId}
                  id={i.productId}
                  name={i.name}
                  slug={i.slug}
                  price={i.price}
                  quantity={i.quantity}
                  image={i.image}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                />
              ))}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatNgnFromKobo(subtotal)}
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/products"
                  className="inline-flex justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Continue shopping
                </Link>

                <Link
                  href="/checkout"
                  className="inline-flex justify-center rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                >
                  Checkout
                </Link>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                You’ll enter your delivery address before Paystack payment.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}