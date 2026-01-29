'use client';

import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type CartItemProps = {
  id: number;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image: string;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
};

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

export default function CartItem({
  id,
  name,
  slug,
  price,
  quantity,
  image,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const [qty, setQty] = useState(quantity);

  const increment = () => {
    const newQty = qty + 1;
    setQty(newQty);
    onUpdateQuantity(id, newQty);
  };

  const decrement = () => {
    if (qty > 1) {
      const newQty = qty - 1;
      setQty(newQty);
      onUpdateQuantity(id, newQty);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-sm sm:grid-cols-12 sm:items-center">
      {/* Product Info */}
      <div className="col-span-1 sm:col-span-5">
        <Link href={`/products/${slug}`} className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 transition-colors hover:text-[#04209d]">
              {name}
            </h3>
            <p className="text-sm text-gray-500">Living Room</p>
          </div>
        </Link>
      </div>

      {/* Quantity Controls */}
      <div className="col-span-1 flex items-center justify-center gap-3 sm:col-span-3">
        <button
          type="button"
          onClick={decrement}
          disabled={qty <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white transition-colors hover:border-[#04209d] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={14} />
        </button>

        <span className="w-8 text-center font-semibold text-gray-900">{qty}</span>

        <button
          type="button"
          onClick={increment}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white transition-colors hover:border-[#04209d] hover:bg-gray-50"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Price */}
      <div className="col-span-1 text-right sm:col-span-3">
        <span className="text-lg font-bold text-gray-900">
          {formatNgnFromKobo(price)}
        </span>
      </div>

      {/* Remove Button */}
      <div className="col-span-1 flex justify-end sm:col-span-1">
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50"
          aria-label="Remove item"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}