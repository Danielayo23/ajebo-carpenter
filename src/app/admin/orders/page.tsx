/* =========================================================
   FILE: src/app/admin/orders/page.tsx
   ========================================================= */

import AdminShell from "../_components/AdminShell";
import OrdersTopTabs from "./_components/OrdersTopTabs";
import OrdersSearch from "./_components/OrdersSearch";
import OrdersFilters from "./_components/OrdersFilters";
import OrdersDonutChart from "./_components/OrdersDonutChart";
import OrderStatusActions, { type DeliveryStatus } from "./_components/OrderStatusActions";
import { DeliveryPill, PaymentPill } from "./_components/OrderStatusPill";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Download, Filter as FilterIcon } from "lucide-react";

type Tab = "summary" | "list";
type Filter = "all" | "shipping" | "completed" | "cancelled";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function parseTab(v: unknown): Tab {
  const t = String(v ?? "");
  return t === "list" ? "list" : "summary";
}

function parseFilter(v: unknown): Filter {
  const f = String(v ?? "");
  if (f === "shipping" || f === "completed" || f === "cancelled") return f;
  return "all";
}

function parsePage(v: unknown): number {
  const n = Number(v ?? 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function timeAgo(from: Date) {
  const s = Math.max(1, Math.floor((Date.now() - from.getTime()) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return `${s}s ago`;
}

export default async function AdminOrdersPage({
  // ✅ Next.js 16: searchParams is a Promise → unwrap it first
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; filter?: string; q?: string; page?: string }>;
}) {
  const sp = (await searchParams) ?? {};

  const tab = parseTab(sp.tab); // ✅ default summary
  const filter = parseFilter(sp.filter);
  const q = (sp.q ?? "").trim();
  const page = parsePage(sp.page);

  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  // CSV Export URL (keeps current list filter/search)
  const exportParams = new URLSearchParams();
  exportParams.set("filter", filter);
  if (q) exportParams.set("q", q);
  const exportUrl = `/api/admin/orders/export?${exportParams.toString()}`;

  // =========================
  // SUMMARY DATA (only fetch if tab=summary)
  // =========================
  let summaryData: {
    totalOrders: number;
    cancelledOrders: number;
    completedOrders: number;
    processingCount: number;
    dispatchedCount: number;
    deliveredCount: number;
    pendingOrders: number;
    recentActivity: Array<{
      id: number;
      createdAt: Date;
      status: string;
      deliveryStatus: string;
    }>;
  } = {
    totalOrders: 0,
    cancelledOrders: 0,
    completedOrders: 0,
    processingCount: 0,
    dispatchedCount: 0,
    deliveredCount: 0,
    pendingOrders: 0,
    recentActivity: [],
  };

  if (tab === "summary") {
    const [
      totalOrders,
      cancelledOrders,
      completedOrders,
      processingCount,
      dispatchedCount,
      deliveredCount,
      pendingOrders,
      recentActivity,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.count({ where: { deliveryStatus: "DELIVERED" } }),
      prisma.order.count({ where: { deliveryStatus: "PROCESSING" } }),
      prisma.order.count({ where: { deliveryStatus: "DISPATCHED" } }),
      prisma.order.count({ where: { deliveryStatus: "DELIVERED" } }),
      prisma.order.count({ where: { status: "PAID", deliveryStatus: { not: "DELIVERED" } } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, status: true, deliveryStatus: true },
      }),
    ]);

    summaryData = {
      totalOrders,
      cancelledOrders,
      completedOrders,
      processingCount,
      dispatchedCount,
      deliveredCount,
      pendingOrders,
      recentActivity,
    };
  }

  // ======================
  // LIST DATA (only fetch if tab=list)
  // ======================
  let listData: {
    counts: { all: number; shipping: number; completed: number; cancelled: number };
    orders: Array<{
      id: number;
      reference: string;
      totalAmount: number;
      status: string;
      deliveryStatus: string;
      createdAt: Date;
      user: { email: string };
      orderItems: Array<{ quantity: number; product: { name: string } }>;
    }>;
    totalForList: number;
  } = {
    counts: { all: 0, shipping: 0, completed: 0, cancelled: 0 },
    orders: [],
    totalForList: 0,
  };

  if (tab === "list") {
    const [allCount, shippingCount, completedCount, cancelledCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { deliveryStatus: { in: ["PROCESSING", "DISPATCHED"] } } }),
      prisma.order.count({ where: { deliveryStatus: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
    ]);

    listData.counts = {
      all: allCount,
      shipping: shippingCount,
      completed: completedCount,
      cancelled: cancelledCount,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listWhere: any = {};

    if (filter === "cancelled") listWhere.status = "CANCELLED";
    else if (filter === "completed") listWhere.deliveryStatus = "DELIVERED";
    else if (filter === "shipping") listWhere.deliveryStatus = { in: ["PROCESSING", "DISPATCHED"] };

    if (q) {
      listWhere.OR = [
        { reference: { contains: q } },
        { user: { email: { contains: q } } },
        // ✅ FIX: Order relation is orderItems (not items / orderitem)
        { orderItems: { some: { product: { name: { contains: q } } } } },
      ];
    }

    const [orders, totalForList] = await Promise.all([
      prisma.order.findMany({
        where: listWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          reference: true,
          totalAmount: true,
          status: true,
          deliveryStatus: true,
          createdAt: true,
          user: { select: { email: true } },
          orderItems: {
            select: { quantity: true, product: { select: { name: true } } },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where: listWhere }),
    ]);

    listData.orders = orders;
    listData.totalForList = totalForList;
  }

  const totalPages = Math.max(1, Math.ceil(listData.totalForList / pageSize));

  // ======================
  // ACTION: update delivery
  // ======================
  async function updateDeliveryStatus(formData: FormData) {
    "use server";

    const orderId = Number(formData.get("orderId"));
    const next = String(formData.get("deliveryStatus")) as DeliveryStatus;
    if (!orderId || Number.isNaN(orderId)) return;

    const current = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryStatus: true, status: true },
    });
    if (!current) return;

    if (current.status === "CANCELLED") return;
    if (current.status !== "PAID") return;
    if (current.deliveryStatus === "DELIVERED") return;

    const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
      PROCESSING: ["DISPATCHED"],
      DISPATCHED: ["DELIVERED"],
      DELIVERED: [],
    };
    if (!allowed[current.deliveryStatus as DeliveryStatus].includes(next)) return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryStatus: next,
        deliveredAt: next === "DELIVERED" ? new Date() : null,
      },
    });

    const params = new URLSearchParams();
    params.set("tab", "list");
    params.set("filter", filter);
    if (q) params.set("q", q);
    params.set("page", String(page));
    redirect(`/admin/orders?${params.toString()}`);
  }

  return (
    <AdminShell title="Orders">
      <div className="space-y-6">
        <OrdersTopTabs />

        {/* SUMMARY TAB */}
        {tab === "summary" && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500">Total Orders</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {summaryData.totalOrders.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500">Pending</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {summaryData.pendingOrders.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500">Completed</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {summaryData.completedOrders.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-medium text-gray-500">Cancelled</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {summaryData.cancelledOrders.toLocaleString()}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">Recent Activity</div>
                <div className="mt-4 space-y-3">
                  {summaryData.recentActivity.length === 0 ? (
                    <div className="text-sm text-gray-500">No activity yet.</div>
                  ) : (
                    summaryData.recentActivity.map((o) => {
                      const msg =
                        o.status === "CANCELLED"
                          ? `Order #${o.id} cancelled`
                          : o.deliveryStatus === "DELIVERED"
                          ? `Order #${o.id} delivered`
                          : o.deliveryStatus === "DISPATCHED"
                          ? `Order #${o.id} shipped`
                          : `New order #${o.id} received`;

                      return (
                        <div
                          key={o.id}
                          className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                        >
                          <div className="text-sm font-medium text-gray-800">{msg}</div>
                          <div className="text-xs text-gray-500">{timeAgo(o.createdAt)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <OrdersDonutChart
                title="Order Status Overview"
                centerValue={summaryData.totalOrders}
                centerLabel="Total Orders"
                slices={[
                  { label: "Delivered", value: summaryData.deliveredCount, color: "#22c55e" },
                  { label: "Shipped", value: summaryData.dispatchedCount, color: "#3b82f6" },
                  { label: "Pending", value: summaryData.processingCount, color: "#f59e0b" },
                  { label: "Cancelled", value: summaryData.cancelledOrders, color: "#ef4444" },
                ]}
              />
            </section>
          </>
        )}

        {/* LIST TAB */}
        {tab === "list" && (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <OrdersSearch />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <span>Filter</span>
                  <FilterIcon size={16} />
                </button>

                <a
                  href={exportUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <span>Export</span>
                  <Download size={16} />
                </a>
              </div>
            </div>

            <OrdersFilters counts={listData.counts} />

            <section>
              <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-600">
                      {/* Hide checkbox on very small screens */}
                      <th className="w-10 py-3 pl-3 pr-3 hidden sm:table-cell">
                        <input type="checkbox" aria-label="Select all" />
                      </th>

                      <th className="py-3 pl-3 pr-3 w-[42%] sm:w-[34%]">Orders</th>

                      {/* Hide Customer column on mobile (we show it inside Orders instead) */}
                      <th className="py-3 pr-3 w-[22%] hidden md:table-cell">Customer</th>

                      <th className="py-3 pr-3 w-[14%]">Price</th>

                      {/* Hide Date on mobile */}
                      <th className="py-3 pr-3 w-[12%] hidden lg:table-cell">Date</th>

                      {/* Hide Payment on mobile */}
                      <th className="py-3 pr-3 w-[10%] hidden lg:table-cell">Payment</th>

                      <th className="py-3 pr-3 w-[12%]">Status</th>

                      <th className="py-3 pr-3 w-[120px] text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {listData.orders.length === 0 ? (
                      <tr>
                        <td className="py-8 px-3 text-gray-500" colSpan={8}>
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      listData.orders.map((o) => {
                        const productName = o.orderItems?.[0]?.product?.name ?? "-";
                        const paymentLabel = o.status === "PAID" ? "Paid" : "Unpaid";
                        const ds = o.deliveryStatus as DeliveryStatus;
                        const disabled = o.status !== "PAID" || ds === "DELIVERED";

                        return (
                          <tr key={o.id} className="border-b last:border-b-0">
                            {/* checkbox hidden on xs */}
                            <td className="py-3 pl-3 pr-3 hidden sm:table-cell align-top">
                              <input type="checkbox" aria-label={`Select order ${o.id}`} />
                            </td>

                            {/* Orders column (compact + contains mobile-only info) */}
                            <td className="py-3 pl-3 pr-3 align-top">
                              <div className="min-w-0">
                                <div className="font-medium text-[#04209d] truncate">#{o.id}</div>

                                <div className="text-xs text-gray-500 truncate">{productName}</div>

                                {/* Reference can be long: truncate */}
                                <div className="text-[11px] text-gray-400 truncate">{o.reference}</div>

                                {/* Mobile-only: show customer + date + payment inside Orders */}
                                <div className="mt-1 space-y-1 md:hidden">
                                  <div className="text-xs text-gray-700 truncate">{o.user.email}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                    <span className="truncate">{formatDate(o.createdAt)}</span>
                                    <span className="shrink-0">•</span>
                                    <span className="shrink-0">{paymentLabel}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Customer (hidden on mobile) */}
                            <td className="py-3 pr-3 text-gray-800 hidden md:table-cell align-top">
                              <div className="truncate">{o.user.email}</div>
                            </td>

                            {/* Price */}
                            <td className="py-3 pr-3 text-gray-800 align-top whitespace-nowrap">
                              {formatNgnFromKobo(o.totalAmount)}
                            </td>

                            {/* Date (hidden on mobile) */}
                            <td className="py-3 pr-3 text-gray-600 hidden lg:table-cell align-top whitespace-nowrap">
                              {formatDate(o.createdAt)}
                            </td>

                            {/* Payment (hidden on mobile) */}
                            <td className="py-3 pr-3 hidden lg:table-cell align-top">
                              <PaymentPill value={paymentLabel} />
                            </td>

                            {/* Status */}
                            <td className="py-3 pr-3 align-top">
                              <DeliveryPill value={ds} />
                            </td>

                            {/* Action */}
                            <td className="py-3 pr-3 text-right align-top">
                              <OrderStatusActions
                                orderId={o.id}
                                deliveryStatus={ds}
                                canEdit={!disabled}
                                action={updateDeliveryStatus}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>


              <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Page <span className="font-semibold text-gray-800">{page}</span> of{" "}
                  <span className="font-semibold text-gray-800">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    className={`rounded-xl bg-white px-3 py-2 shadow-sm transition ${
                      page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
                    }`}
                    href={`/admin/orders?tab=list&filter=${filter}${
                      q ? `&q=${encodeURIComponent(q)}` : ""
                    }&page=${page - 1}`}
                  >
                    Prev
                  </a>

                  <a
                    className={`rounded-xl bg-white px-3 py-2 shadow-sm transition ${
                      page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
                    }`}
                    href={`/admin/orders?tab=list&filter=${filter}${
                      q ? `&q=${encodeURIComponent(q)}` : ""
                    }&page=${page + 1}`}
                  >
                    Next
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
