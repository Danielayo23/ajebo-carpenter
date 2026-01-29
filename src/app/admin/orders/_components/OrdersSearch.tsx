/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersSearch.tsx
   ========================================================= */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function OrdersSearch() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function submit() {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", "list");
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <div className="flex w-full max-w-2xl items-center rounded-2xl bg-white px-4 py-3 shadow-sm">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Search for id, name, product"
        className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
      />

      <button
        type="button"
        onClick={submit}
        className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-50 transition-colors"
        aria-label="Search"
      >
        <Search size={18} className="text-gray-500" />
      </button>
    </div>
  );
}