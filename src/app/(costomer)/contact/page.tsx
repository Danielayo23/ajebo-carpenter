"use client";

import { useState } from "react";
import { Mail, Phone, CheckCircle2, AlertCircle } from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<null | { type: "success" | "error"; title: string; desc?: string }>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setToast(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setToast({
          type: "error",
          title: "Message not sent",
          desc: data?.message ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setToast({
        type: "success",
        title: "Message sent!",
        desc: "We'll get back to you soon.",
      });

      form.reset();
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({
        type: "error",
        title: "Message not sent",
        desc: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div
            className={`flex items-center gap-3 rounded-xl px-6 py-4 text-white shadow-xl ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <div>
              <p className="font-semibold">{toast.title}</p>
              {toast.desc ? <p className="text-sm opacity-90">{toast.desc}</p> : null}
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-12 text-center">
        <h1 className="text-4xl font-bold text-[#04209d] md:text-5xl">Contact Us</h1>
      </section>

      {/* Contact Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Side - Image & Info */}
          <div className="flex flex-col justify-center">
            <div className="overflow-hidden rounded-3xl shadow-lg">
              <img
                src="/contact image.jpg"
                alt="Comfortable reading corner"
                className="h-96 w-full object-cover"
              />
            </div>

            <div className="mt-8 space-y-6 rounded-2xl bg-gray-50 p-6">
              <p className="text-sm leading-relaxed text-gray-700">
                We are excited to meet you, but we are still far to meet you. The team will be happy
                to listen to your request and offer further assistance.
              </p>

              <div className="space-y-4">
                <a
                  href="mailto:info@ajebocarpenter.com"
                  className="flex items-center gap-3 text-sm text-gray-700 transition-colors hover:text-[#04209d]"
                >
                  <Mail size={18} className="text-[#04209d]" />
                  <span>info@ajebocarpenter.com</span>
                </a>

                <a
                  href="tel:+2348154442381"
                  className="flex items-center gap-3 text-sm text-gray-700 transition-colors hover:text-[#04209d]"
                >
                  <Phone size={18} className="text-[#04209d]" />
                  <span>+234-815-444-2381</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Side - Contact Form */}
          <div className="flex items-center">
            <div className="w-full rounded-3xl border border-gray-200 bg-white p-8 shadow-lg lg:p-10">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-[#04209d]">We'd love to hear from you!</h2>
                <p className="mt-2 text-gray-600">Let's get in touch</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <textarea
                    name="message"
                    placeholder="Your Message"
                    rows={6}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20 disabled:cursor-not-allowed disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#04209d] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#0530cc] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </div>

                <p className="text-center text-xs text-gray-500">
                  By sending this, you agree we can contact you back via email.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
