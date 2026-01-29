/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersTopTabs.tsx
   ========================================================= */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = "summary" | "list";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function OrdersTopTabs() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = (sp.get("tab") as Tab) ?? "summary";

  const mk = (t: Tab) => {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", t);
    if (t === "summary") {
      params.delete("q");
      params.delete("filter");
      params.delete("page");
    }
    return `${pathname}?${params.toString()}`;
  };

  const tabClass = (active: boolean) =>
    cn(
      "flex-1 rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all",
      active ? "bg-[#0a1446] text-white shadow-sm" : "bg-white text-gray-700 hover:bg-gray-50"
    );

  return (
    <div className="w-full rounded-2xl bg-white p-1.5 shadow-sm">
      <div className="grid grid-cols-2 gap-1.5">
        <Link href={mk("summary")} className={tabClass(tab === "summary")}>
          Order Summary
        </Link>
        <Link href={mk("list")} className={tabClass(tab === "list")}>
          Order List
        </Link>
      </div>
    </div>
  );
}