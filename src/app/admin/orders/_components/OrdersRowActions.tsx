/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersRowActions.tsx
   (Copy + Delete icons in Action column)
   ========================================================= */
"use client";

import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";

export default function OrdersRowActions({
  orderId,
  copyText,
  deleteAction,
}: {
  orderId: number;
  copyText: string;
  deleteAction: (formData: FormData) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={doCopy}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-gray-700 hover:bg-gray-50"
        aria-label="Copy"
        title={copied ? "Copied!" : "Copy"}
      >
        <Copy size={16} />
      </button>

      <form
        action={deleteAction}
        onSubmit={(e) => {
          const ok = confirm("Delete this order? This cannot be undone.");
          if (!ok) e.preventDefault();
        }}
      >
        <input type="hidden" name="orderId" value={orderId} />
        <button
          type="submit"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-red-600 hover:bg-red-50"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </form>
    </div>
  );
}
