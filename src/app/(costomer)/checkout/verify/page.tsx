"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VerifyStatus = "success" | "failed" | "pending";

type ApiResult = {
  ok: boolean;
  status: VerifyStatus;
  reference?: string;
  message?: string;
};

type UiStatus = "loading" | VerifyStatus;

export default function VerifyPage() {
  const sp = useSearchParams();

  const reference = useMemo(
    () => (sp.get("reference") ?? sp.get("trxref") ?? "").trim(),
    [sp]
  );

  const [status, setStatus] = useState<UiStatus>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function run() {
      if (!reference) {
        setStatus("failed");
        setMessage("Missing payment reference.");
        return;
      }

      setStatus("loading");
      setMessage("");

      const maxAttempts = 6;
      const backoff = [0, 1000, 2000, 3000, 5000, 8000];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (cancelled) return;

        if (attempt > 0) setStatus("pending");

        try {
          const res = await fetch(
            `/api/checkout/paystack/verify?reference=${encodeURIComponent(reference)}`,
            { cache: "no-store" }
          );

          const data = (await res.json().catch(() => null)) as ApiResult | null;
          if (cancelled) return;

          if (res.ok && data?.status === "success") {
            setStatus("success");
            setMessage("");
            sessionStorage.removeItem("ajebo_checkout_key");
            return;
          }

          if (res.ok && data?.status === "failed") {
            setStatus("failed");
            setMessage(data.message ?? "Payment was not completed.");
            return;
          }

          setStatus("pending");
          setMessage(
            data?.message ??
              "We’re confirming your payment. This can take a few seconds. Please wait…"
          );
        } catch {
          setStatus("pending");
          setMessage("We’re confirming your payment. Please wait…");
        }

        await sleep(backoff[Math.min(attempt, backoff.length - 1)]);
      }

      if (!cancelled) {
        setStatus("pending");
        setMessage(
          "Your payment may still be processing. If you were debited, refresh this page in a moment or contact support with your reference."
        );
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">
          Payment Verification
        </h1>
        <p className="mt-3 text-base text-gray-600 md:text-lg">
          Reference: <span className="font-semibold">{reference || "-"}</span>
        </p>
      </section>

      <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gray-50 p-8 text-center">
          {status === "loading" ? (
            <p className="text-sm text-gray-700">Verifying your payment…</p>
          ) : status === "pending" ? (
            <>
              <p className="text-lg font-semibold text-gray-900">Payment pending ⏳</p>
              <p className="mt-2 text-sm text-gray-600">{message}</p>

              <div className="mt-6 flex justify-center gap-3">
                <Link
                  className="rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white"
                  href={`/checkout/verify?reference=${encodeURIComponent(reference)}`}
                >
                  Refresh
                </Link>
                <Link
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200"
                  href="/cart"
                >
                  Back to cart
                </Link>
              </div>
            </>
          ) : status === "success" ? (
            <>
              <p className="text-lg font-semibold text-gray-900">Payment successful ✅</p>
              <p className="mt-2 text-sm text-gray-600">
                Thanks! Your order is now confirmed.
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <Link
                  className="rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white"
                  href="/products"
                >
                  Continue shopping
                </Link>
                <Link
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200"
                  href="/cart"
                >
                  View cart
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900">Payment failed ❌</p>
              <p className="mt-2 text-sm text-gray-600">
                {message || "If you were debited, contact support with your reference."}
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <Link
                  className="rounded-xl bg-[#04209d] px-5 py-2.5 text-sm font-semibold text-white"
                  href="/cart"
                >
                  Back to cart
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

