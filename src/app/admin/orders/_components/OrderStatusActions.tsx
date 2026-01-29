/* =========================================================
   FILE: src/app/admin/orders/_components/OrderStatusActions.tsx
   ========================================================= */
"use client";

import { useState } from "react";

export type DeliveryStatus = "PROCESSING" | "DISPATCHED" | "DELIVERED";

export default function OrderStatusActions({
  orderId,
  deliveryStatus,
  canEdit,
  action,
}: {
  orderId: number;
  deliveryStatus: DeliveryStatus;
  canEdit: boolean;
  action: (formData: FormData) => void;
}) {
  const [next, setNext] = useState<DeliveryStatus>(deliveryStatus);

  return (
    <form action={action} className="flex items-center justify-end gap-2">
      <input type="hidden" name="orderId" value={orderId} />

      <select
        name="deliveryStatus"
        value={next}
        onChange={(e) => setNext(e.target.value as DeliveryStatus)}
        disabled={!canEdit}
        className="rounded-md border px-2 py-1 text-xs disabled:opacity-60"
      >
        <option value="PROCESSING">Processing</option>
        <option value="DISPATCHED">Shipped</option>
        <option value="DELIVERED">Completed</option>
      </select>

      <button
        type="submit"
        disabled={!canEdit || next === deliveryStatus}
        className="rounded bg-[#04209d] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}
