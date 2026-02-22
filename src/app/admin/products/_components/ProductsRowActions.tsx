"use client";

import Link from "next/link";
import { Edit2, ArchiveRestore, Archive } from "lucide-react";

export default function ProductsRowActions({
  productId,
  active,
  onToggleActive,
}: {
  productId: number;
  active: boolean;
  onToggleActive: (formData: FormData) => void;
}) {
  const label = active ? "Archive" : "Reactivate";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/products/${productId}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        title="Edit"
      >
        <Edit2 size={16} />
      </Link>

      <form action={onToggleActive}>
        <input type="hidden" name="id" value={productId} />
        <button
          type="submit"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-colors ${
            active ? "text-red-600 hover:bg-red-50" : "text-green-700 hover:bg-green-50"
          }`}
          title={label}
          onClick={(e) => {
            const msg = active
              ? "Archive this product? (It will be hidden from customers)"
              : "Reactivate this product? (It will show to customers again)";
            if (!confirm(msg)) e.preventDefault();
          }}
        >
          {active ? <Archive size={16} /> : <ArchiveRestore size={16} />}
        </button>
      </form>
    </div>
  );
}