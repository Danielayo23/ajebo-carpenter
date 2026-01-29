/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersFilters.tsx
   ========================================================= */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Filter = "all" | "shipping" | "completed" | "cancelled";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function OrdersFilters({
  counts,
}: {
  counts: { all: number; shipping: number; completed: number; cancelled: number };
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const filter = (sp.get("filter") as Filter) ?? "all";

  const mkHref = (next: Filter) => {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", "list");
    params.set("filter", next);
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  };

  const item = (active: boolean) =>
    cn(
      "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all",
      active ? "bg-blue-50 text-[#04209d]" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
    );

  return (
    <div className="rounded-2xl bg-white p-1.5 shadow-sm">
      <div className="grid grid-cols-4 gap-1.5">
        <Link href={mkHref("all")} className={item(filter === "all")}>
          All Orders ({counts.all})
        </Link>
        <Link href={mkHref("shipping")} className={item(filter === "shipping")}>
          Shipping ({counts.shipping})
        </Link>
        <Link href={mkHref("completed")} className={item(filter === "completed")}>
          Completed ({counts.completed})
        </Link>
        <Link href={mkHref("cancelled")} className={item(filter === "cancelled")}>
          Cancel ({counts.cancelled})
        </Link>
      </div>
    </div>
  );
}