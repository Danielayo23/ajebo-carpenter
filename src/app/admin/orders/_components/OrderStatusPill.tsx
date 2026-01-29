/* =========================================================
   FILE: src/app/admin/orders/_components/OrderStatusPill.tsx
   ========================================================= */
export type PaymentLabel = "Paid" | "Unpaid";
export type DeliveryStatus = "PROCESSING" | "DISPATCHED" | "DELIVERED";

export function PaymentPill({ value }: { value: PaymentLabel }) {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  if (value === "Paid") return <span className={`${base} bg-green-100 text-green-700`}>Paid</span>;
  return <span className={`${base} bg-yellow-100 text-yellow-700`}>Unpaid</span>;
}

export function DeliveryPill({ value }: { value: DeliveryStatus }) {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold";
  if (value === "PROCESSING") return <span className={`${base} bg-yellow-100 text-yellow-700`}>Processing</span>;
  if (value === "DISPATCHED") return <span className={`${base} bg-blue-100 text-blue-700`}>Shipped</span>;
  return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
}
