import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

export default async function OrdersPage() {
  const { userId } = await auth();
  if (!userId) return <div className="p-8">Please sign in.</div>;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return <div className="p-8">User not found.</div>;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      totalAmount: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>

      {orders.length === 0 ? (
        <p className="mt-4 text-gray-600">No orders yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.reference}
              href={`/orders/${encodeURIComponent(o.reference)}`}
              className="block rounded-2xl border bg-white p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">#{o.reference}</div>
                <div className="text-sm text-gray-600">{formatNgnFromKobo(o.totalAmount)}</div>
              </div>
              <div className="mt-1 text-sm text-gray-600">Status: {o.status}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
