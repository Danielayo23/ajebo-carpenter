import AdminShell from "./_components/AdminShell";
import { prisma } from "@/lib/prisma";

type DeliveryStatus = "PROCESSING" | "DISPATCHED" | "DELIVERED";

type RecentOrderRow = {
  id: number;
  customer: string;
  date: string;
  status: DeliveryStatus;
  total: number; // kobo
};

type BestSellerRow = {
  productId: number;
  name: string;
  units: number;
  imageUrl?: string;
};

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function StatusPill({ status }: { status: DeliveryStatus }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium";
  const styles: Record<DeliveryStatus, string> = {
    PROCESSING: "bg-yellow-100 text-yellow-700",
    DISPATCHED: "bg-blue-100 text-blue-700",
    DELIVERED: "bg-green-100 text-green-700",
  };

  const label: Record<DeliveryStatus, string> = {
    PROCESSING: "Processing",
    DISPATCHED: "Dispatched",
    DELIVERED: "Delivered",
  };

  return <span className={`${base} ${styles[status]}`}>{label[status]}</span>;
}

function SalesTrendsCard({
  percentChange,
  points,
}: {
  percentChange: number;
  points: number[]; // 30 points of daily kobo totals
}) {
  const w = 600;
  const h = 200;

  const max = Math.max(1, ...points);
  const min = Math.min(...points);

  const scaleX = (i: number) => (i / Math.max(1, points.length - 1)) * w;
  const scaleY = (v: number) => {
    const range = Math.max(1, max - min);
    const norm = (v - min) / range;
    return h - norm * (h - 20) - 10;
  };

  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`)
    .join(" ");

  const positive = percentChange >= 0;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Sales Trends</div>
          <div className="mt-1 text-xs text-gray-500">
            <span
              className={`font-semibold ${
                positive ? "text-green-600" : "text-red-600"
              }`}
            >
              {positive ? "+" : ""}
              {percentChange.toFixed(1)}%
            </span>{" "}
            in the last 30 days
          </div>
        </div>
      </div>

      <div className="h-44 w-full overflow-hidden rounded-lg bg-gradient-to-b from-blue-50 to-white">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
          <path
            d={path}
            fill="none"
            stroke="rgba(4,32,157,0.85)"
            strokeWidth="4"
          />
        </svg>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const start30d = new Date(now);
  start30d.setDate(now.getDate() - 30);

  const startPrev30d = new Date(now);
  startPrev30d.setDate(now.getDate() - 60);

  // 1) Total sales (PAID) last 30 days
  const totalSalesAgg = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      status: "PAID",
      createdAt: { gte: start30d },
    },
  });
  const totalSales30dKobo = totalSalesAgg._sum.totalAmount ?? 0;

  // 2) Pending orders (PAID but not delivered) all time
  const pendingPaidAllTime = await prisma.order.count({
    where: {
      status: "PAID",
      deliveryStatus: { not: "DELIVERED" },
    },
  });

  // 3) Low stock alerts (< 5) active products
  const lowStockAlerts = await prisma.product.count({
    where: {
      active: true,
      stock: { lt: 5 },
    },
  });

  // 4) Best sellers (top 10 by units in last 30 days; only PAID orders)
  const topItems = await prisma.orderitem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: {
      order: {
        status: "PAID",
        createdAt: { gte: start30d },
      },
    },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  const productIds = topItems.map((x) => x.productId);

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, imageUrl: true },
      })
    : [];

  const byId = new Map(products.map((p) => [p.id, p]));
  const bestSellers: BestSellerRow[] = topItems.map((x) => {
    const p = byId.get(x.productId);
    return {
      productId: x.productId,
      name: p?.name ?? `Product ${x.productId}`,
      units: x._sum.quantity ?? 0,
      imageUrl: p?.imageUrl,
    };
  });

  // 5) Recent PAID orders (latest)
  const recentOrdersRaw = await prisma.order.findMany({
    where: { status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      totalAmount: true,
      deliveryStatus: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  const recentOrders: RecentOrderRow[] = recentOrdersRaw.map((o) => ({
    id: o.id,
    customer: o.user.email,
    date: formatDate(o.createdAt),
    status: o.deliveryStatus as DeliveryStatus,
    total: o.totalAmount,
  }));

  // 6) Sales trends (daily totals for last 30 days) + percent change vs previous 30 days
  const orders60d = await prisma.order.findMany({
    where: {
      status: "PAID",
      createdAt: { gte: startPrev30d },
    },
    select: { createdAt: true, totalAmount: true },
  });

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const totalsByDay = new Map<string, number>();
  for (const o of orders60d) {
    const k = dayKey(o.createdAt);
    totalsByDay.set(k, (totalsByDay.get(k) ?? 0) + o.totalAmount);
  }

  const points30: number[] = [];
  let sum30 = 0;
  let sumPrev30 = 0;

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const k = dayKey(d);
    const v = totalsByDay.get(k) ?? 0;

    if (i < 30) {
      points30.push(v);
      sum30 += v;
    } else {
      sumPrev30 += v;
    }
  }

  const percentChange =
    sumPrev30 === 0 ? (sum30 > 0 ? 100 : 0) : ((sum30 - sumPrev30) / sumPrev30) * 100;

  return (
    <AdminShell title="Dashboard">
      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Total Sales (30 days)</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {formatNgnFromKobo(totalSales30dKobo)}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Pending Orders (Paid)</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {pendingPaidAllTime}
          </div>
          <div className="mt-1 text-xs text-gray-500">Not delivered (all time)</div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Low Stock Alerts</div>
          <div className="mt-1 text-lg font-semibold text-red-600">
            {lowStockAlerts}
          </div>
          <div className="mt-1 text-xs text-gray-500">Stock &lt; 5</div>
        </div>
      </section>

      {/* Trends + Best sellers */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SalesTrendsCard percentChange={percentChange} points={points30} />
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Best sellers</div>
          <div className="mt-3 space-y-3">
            {bestSellers.length === 0 ? (
              <div className="text-sm text-gray-500">No sales yet.</div>
            ) : (
              bestSellers.map((p) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <div className="h-9 w-9 overflow-hidden rounded bg-gray-100">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-500">{p.units} units sold</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent Orders */}
      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-gray-900">Recent Orders</div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-2 pr-3">Order ID</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={5}>
                    No paid orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3 font-medium text-[#04209d]">
                      #{o.id}
                    </td>
                    <td className="py-3 pr-3 text-gray-800">{o.customer}</td>
                    <td className="py-3 pr-3 text-gray-600">{o.date}</td>
                    <td className="py-3 pr-3">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="py-3 pr-3 text-right text-gray-800">
                      {formatNgnFromKobo(o.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

