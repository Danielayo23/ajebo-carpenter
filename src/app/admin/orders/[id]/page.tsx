import AdminShell from "../../_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!orderId || Number.isNaN(orderId)) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      payment: true,
      orderItems: {
        include: { product: true },
      },
    },
  });

  if (!order) notFound();

  const shipping = {
    fullName: (order as any).shipFullName ?? "",
    phone: (order as any).shipPhone ?? "",
    line1: (order as any).shipLine1 ?? "",
    line2: (order as any).shipLine2 ?? "",
    landmark: (order as any).shipLandmark ?? "",
    city: (order as any).shipCity ?? "",
    state: (order as any).shipState ?? "",
  };

  const hasShipping =
    shipping.fullName && shipping.phone && shipping.line1 && shipping.city && shipping.state;

  return (
    <AdminShell title={`Order #${order.id}`}>
      <div className="space-y-6">
        {/* Top meta */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Order #{order.id}</div>
              <div className="mt-1 text-xs text-gray-500">
                Ref: <span className="font-medium text-gray-800">{order.reference}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Date: <span className="font-medium text-gray-800">{formatDate(order.createdAt)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                Order: {order.status}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                Delivery: {order.deliveryStatus}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                Checkout: {(order as any).checkoutStatus ?? "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Customer */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-gray-900">Customer</div>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="font-medium text-gray-900">{order.user.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">User ID</div>
                <div className="font-medium text-gray-900">{order.userId}</div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-gray-900">Payment</div>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Provider</div>
                <div className="font-medium text-gray-900">{order.payment?.provider ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="font-medium text-gray-900">{order.payment?.status ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Paystack Ref</div>
                <div className="font-medium text-gray-900 break-all">{order.payment?.paystackRef ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Paid at</div>
                <div className="font-medium text-gray-900">
                  {order.payment?.paidAt ? formatDate(order.payment.paidAt) : "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="text-sm font-semibold text-gray-900">Shipping Address</div>

            {!hasShipping ? (
              <div className="mt-3 text-sm text-gray-500">No address saved on this order.</div>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="font-semibold text-gray-900">{shipping.fullName}</div>
                <div>{shipping.phone}</div>
                <div>{shipping.line1}</div>
                {shipping.line2 ? <div>{shipping.line2}</div> : null}
                {shipping.landmark ? (
                  <div className="text-xs text-gray-600">Landmark: {shipping.landmark}</div>
                ) : null}
                <div>
                  {shipping.city}, {shipping.state}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Items</div>
            <div className="text-sm font-bold text-gray-900">{formatNgnFromKobo(order.totalAmount)}</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems.map((it) => {
                  const unit = it.price ?? it.product.price;
                  const lineTotal = unit * it.quantity;
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{it.product.name}</div>
                        <div className="text-xs text-gray-500">{it.product.slug}</div>
                      </td>
                      <td className="px-4 py-3">{it.quantity}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatNgnFromKobo(unit)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {formatNgnFromKobo(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}