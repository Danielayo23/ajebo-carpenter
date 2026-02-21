"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Address = {
  id: number;
  userId: number;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
};

type AddressForm = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
};

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "FCT  - Abuja",
];

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"
      />
    </svg>
  );
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<Address | null>(null);

  const [step, setStep] = useState<"address" | "pay">("address");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState<AddressForm>({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
  });

  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string>("");

  const canUseSaved = useMemo(() => {
    return Boolean(address?.fullName && address?.phone && address?.line1 && address?.city && address?.state);
  }, [address]);

  async function loadAddress() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/address", { cache: "no-store" });

      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/checkout")}`;
        return;
      }

      const data = (await res.json().catch(() => null)) as any;

      if (res.ok && data?.ok) {
        const a: Address | null = data.address ?? null;
        setAddress(a);

        if (a) {
          setForm({
            fullName: a.fullName ?? "",
            phone: a.phone ?? "",
            line1: a.line1 ?? "",
            line2: a.line2 ?? "",
            landmark: a.landmark ?? "",
            city: a.city ?? "",
            state: a.state ?? "",
          });
        }

        // If they already have an address, show reuse screen first
        setEditing(!a);
      } else {
        setError(data?.error ?? "Unable to load address.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateForm(f: AddressForm) {
    if (!f.fullName.trim()) return "Full name is required.";
    if (!f.phone.trim()) return "Phone is required.";
    if (!f.line1.trim()) return "Address line 1 is required.";
    if (!f.city.trim()) return "City is required.";
    if (!f.state.trim()) return "State is required.";
    return "";
  }

  async function saveAddress() {
    setError("");
    const msg = validateForm(form);
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          line1: form.line1,
          line2: form.line2 || null,
          landmark: form.landmark || null,
          city: form.city,
          state: form.state,
        }),
      });

      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/checkout")}`;
        return;
      }

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Failed to save address.");
        return;
      }

      setAddress(data.address);
      setEditing(false);
      setStep("pay");
    } catch {
      setError("Network error while saving address.");
    } finally {
      setSaving(false);
    }
  }

  async function payNow() {
    setError("");
    setPaying(true);

    try {
      // Idempotency key (same pattern you used)
      let checkoutKey = sessionStorage.getItem("ajebo_checkout_key");
      if (!checkoutKey) {
        checkoutKey = crypto.randomUUID();
        sessionStorage.setItem("ajebo_checkout_key", checkoutKey);
      }

      const res = await fetch("/api/checkout/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutKey }),
      });

      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/checkout")}`;
        return;
      }

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok || !data?.authorizationUrl) {
        setError(data?.error ?? "Unable to start Paystack checkout.");
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  const showReuseCard = canUseSaved && !editing;

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">Checkout</h1>
        <p className="mt-3 text-base text-gray-600 md:text-lg">
          Step 1: Delivery Address → Step 2: Paystack Payment
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">
            Loading your address…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Error */}
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* Address Step */}
            {step === "address" && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Delivery Address</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      We’ll save this to your profile for future orders.
                    </p>
                  </div>

                  <Link
                    href="/cart"
                    className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Back to cart
                  </Link>
                </div>

                {/* Reuse saved address card */}
                {showReuseCard ? (
                  <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                    <div className="text-sm font-semibold text-gray-900">{address?.fullName}</div>
                    <div className="mt-1 text-sm text-gray-700">{address?.phone}</div>
                    <div className="mt-2 text-sm text-gray-700">
                      {address?.line1}
                      {address?.line2 ? <>, {address.line2}</> : null}
                    </div>
                    {address?.landmark ? (
                      <div className="mt-1 text-sm text-gray-700">Landmark: {address.landmark}</div>
                    ) : null}
                    <div className="mt-1 text-sm text-gray-700">
                      {address?.city}, {address?.state}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                      >
                        Edit address
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep("pay")}
                        className="inline-flex justify-center rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                      >
                        Use this address
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Address form */}
                {editing ? (
                  <div className="mt-6 grid grid-cols-1 gap-4">
                    <input
                      value={form.fullName}
                      onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                    />

                    <input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="Phone"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                    />

                    <input
                      value={form.line1}
                      onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
                      placeholder="Address line 1"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                    />

                    <input
                      value={form.line2}
                      onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))}
                      placeholder="Address line 2 (optional)"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                    />

                    <input
                      value={form.landmark}
                      onChange={(e) => setForm((p) => ({ ...p, landmark: e.target.value }))}
                      placeholder="Landmark (optional)"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <input
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="City"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                      />

                      <select
                        value={form.state}
                        onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#04209d] focus:ring-2 focus:ring-[#04209d]/20"
                      >
                        <option value="">Select state</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      {canUseSaved ? (
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          disabled={saving}
                          className="inline-flex justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={saveAddress}
                        disabled={saving}
                        className="inline-flex justify-center rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-2">
                          {saving ? <Spinner /> : null}
                          {saving ? "Saving…" : "Save address"}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Pay Step */}
            {step === "pay" && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      You’ll be redirected to Paystack to complete your payment.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("address")}
                    className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Change address
                  </button>
                </div>

                {/* Address summary */}
                {address ? (
                  <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                    <div className="text-sm font-semibold text-gray-900">{address.fullName}</div>
                    <div className="mt-1 text-sm text-gray-700">{address.phone}</div>
                    <div className="mt-2 text-sm text-gray-700">
                      {address.line1}
                      {address.line2 ? <>, {address.line2}</> : null}
                    </div>
                    {address.landmark ? (
                      <div className="mt-1 text-sm text-gray-700">Landmark: {address.landmark}</div>
                    ) : null}
                    <div className="mt-1 text-sm text-gray-700">
                      {address.city}, {address.state}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
                    No address found. Please go back and add one.
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Link
                    href="/cart"
                    className="inline-flex justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Back to cart
                  </Link>

                  <button
                    type="button"
                    onClick={payNow}
                    disabled={paying || !address}
                    className="inline-flex justify-center rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2">
                      {paying ? <Spinner /> : null}
                      {paying ? "Redirecting…" : "Pay with Paystack"}
                    </span>
                  </button>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  If payment completes but confirmation delays, your verify page will show “pending” until it’s confirmed.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}