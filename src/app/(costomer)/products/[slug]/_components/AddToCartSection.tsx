"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus } from "lucide-react";

export default function AddToCartSection({
  productId,
  price,
  stock,
}: {
  productId: number;
  price: string;
  stock: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const increment = () => {
    if (quantity < stock) setQuantity((q) => q + 1);
  };

  const decrement = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  const handleAddToCart = async () => {
    setMsg(null);
    setAdding(true);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });

      if (res.status === 401) {
        // Clerk sign-in (adjust if your route differs)
        const redirect = encodeURIComponent(window.location.pathname);
        window.location.href = `/sign-in?redirect_url=${redirect}`;
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add to cart");
      }

      setMsg("Added to cart ✅");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to add to cart");
    } finally {
      setAdding(false);
      setTimeout(() => setMsg(null), 2000);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">Quantity:</span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={decrement}
            disabled={quantity <= 1 || adding}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-[#04209d] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus size={18} />
          </button>

          <span className="w-12 text-center text-lg font-bold text-gray-900">
            {quantity}
          </span>

          <button
            type="button"
            onClick={increment}
            disabled={quantity >= stock || adding}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-[#04209d] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus size={18} />
          </button>
        </div>

        <span className="text-sm text-gray-500">({stock} available)</span>
      </div>

      {/* Price & Add to Cart Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-3xl font-bold text-[#04209d]">{price}</div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={stock === 0 || adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#04209d] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#0530cc] hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60"
        >
          <ShoppingCart size={20} />
          <span>
            {stock === 0 ? "Out of Stock" : adding ? "Adding…" : "Add to Cart"}
          </span>
        </button>
      </div>

      {msg ? (
        <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
          {msg}
        </div>
      ) : null}

      {stock > 0 && stock < 5 && (
        <div className="rounded-xl bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">
          <span className="font-semibold">Low stock!</span> Only {stock} left in stock.
        </div>
      )}

      {stock === 0 && (
        <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <span className="font-semibold">Out of stock.</span> This item is currently unavailable.
        </div>
      )}
    </div>
  );
}
