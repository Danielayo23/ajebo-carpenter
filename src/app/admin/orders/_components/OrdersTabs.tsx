/* =========================================================
   FILE: src/app/admin/orders/_components/OrdersTabs.tsx
   ========================================================= */
// "use client";

// import Link from "next/link";
// import { usePathname, useSearchParams } from "next/navigation";

// type Tab = {
//   label: string;
//   value: "PROCESSING" | "DISPATCHED" | "DELIVERED";
// };

// const TABS: Tab[] = [
//   { label: "Processing", value: "PROCESSING" },
//   { label: "Dispatched", value: "DISPATCHED" },
//   { label: "Delivered", value: "DELIVERED" },
// ];

// function cn(...classes: Array<string | false | undefined | null>) {
//   return classes.filter(Boolean).join(" ");
// }

// export default function OrdersTabs() {
//   const pathname = usePathname();
//   const params = useSearchParams();
//   const status = (params.get("status") as Tab["value"]) ?? "PROCESSING";

//   return (
//     <div className="flex flex-wrap gap-2">
//       {TABS.map((t) => {
//         const active = status === t.value;
//         const href = `${pathname}?status=${t.value}`;

//         return (
//           <Link
//             key={t.value}
//             href={href}
//             className={cn(
//               "rounded-full border px-4 py-2 text-sm font-medium transition",
//               active
//                 ? "border-[#04209d] bg-[#04209d] text-white"
//                 : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
//             )}
//           >
//             {t.label}
//           </Link>
//         );
//       })}
//     </div>
//   );
// }
