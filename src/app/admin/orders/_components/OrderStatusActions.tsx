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
    <form
      action={action}
      className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end"
    >
      <input type="hidden" name="orderId" value={orderId} />

      <select
        name="deliveryStatus"
        value={next}
        onChange={(e) => setNext(e.target.value as DeliveryStatus)}
        disabled={!canEdit}
        className="w-full min-w-0 max-w-full rounded-md border px-2 py-1 text-xs disabled:opacity-60 sm:w-[160px]"
      >
        <option value="PROCESSING">Processing</option>
        <option value="DISPATCHED">Shipped</option>
        <option value="DELIVERED">Completed</option>
      </select>

      <button
        type="submit"
        disabled={!canEdit || next === deliveryStatus}
        className="shrink-0 rounded bg-[#04209d] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Save
      </button>
    </form>
  );
}