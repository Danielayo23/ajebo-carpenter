"use client";

import Link from "next/link";
import { Edit2, Trash2 } from "lucide-react";

export default function ProductsRowActions({
  productId,
  onDelete,
}: {
  productId: number;
  onDelete: (formData: FormData) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/products/${productId}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        title="Edit"
      >
        <Edit2 size={16} />
      </Link>

      <form action={onDelete}>
        <input type="hidden" name="id" value={productId} />
        <button
          type="submit"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50"
          title="Delete"
          onClick={(e) => {
            if (!confirm("Delete this product?")) e.preventDefault();
          }}
        >
          <Trash2 size={16} />
        </button>
      </form>
    </div>
  );
}
