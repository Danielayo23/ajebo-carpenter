"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu } from "lucide-react";

export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop */}
      <div className="hidden md:flex">
        <div className="fixed inset-y-0 left-0">
          <AdminSidebar />
        </div>

        <main className="ml-64 w-full">
          <header className="sticky top-0 z-10 border-b bg-white">
            <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
        </main>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <header className="sticky top-0 z-20 border-b bg-white">
          <div className="flex h-16 items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded p-2 hover:bg-gray-100"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-30">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0">
              <AdminSidebar onClose={() => setOpen(false)} />
            </div>
          </div>
        )}

        <div className="px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
