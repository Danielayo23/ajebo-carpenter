import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

export default async function OrderDetailsPage({ params }: { params: { reference: string } }) {
  const { userId } = await auth();
  if (!userId) return <div className="p-8">Please sign in.</div>;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return <div className="p-8">User not found.</div>;

  const order = await prisma.order.findFirst({
    where: { reference: params.reference, userId: user.id },
    include: {
      orderItems: { include: { product: true } },
      payment: true,
    },
  });

  if (!order) return <div className="p-8">Order not found.</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Order #{order.reference}</h1>

      <div className="mt-4 rounded-2xl border bg-white p-5">
        <div className="text-sm text-gray-700">Payment: {order.payment?.status ?? "—"}</div>
        <div className="text-sm text-gray-700">Order status: {order.status}</div>
        <div className="mt-2 text-lg font-bold">{formatNgnFromKobo(order.totalAmount)}</div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5">
        <div className="font-semibold text-gray-900">Items</div>
        <div className="mt-3 space-y-2">
          {order.orderItems.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div>{it.product.name} × {it.quantity}</div>
              <div>{formatNgnFromKobo(it.price * it.quantity)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
