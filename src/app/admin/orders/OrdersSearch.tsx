/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersSearch.tsx
   ========================================================= */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
    <div className="flex w-full max-w-xl items-center gap-2 rounded-lg border bg-white px-3 py-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Search for id, name, product"
        className="w-full bg-transparent text-sm outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="rounded-md bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
      >
        Search
      </button>
    </div>
  );
}
