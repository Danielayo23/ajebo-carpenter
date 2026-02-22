import { SignUp } from "@clerk/nextjs";
import CustomerHeader from "@/components/customer-header";
import Footer from "@/components/customer-footer";

export default function Page() {
  return (
    <>
      <CustomerHeader />

      <main className="min-h-[calc(100vh-120px)] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="py-12 sm:py-16">
            <div className="mx-auto w-full max-w-[520px]">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[#04209d] sm:text-3xl">
                  Sign Up
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  Welcome! Get started in seconds
                </p>
              </div>

              <div className="mt-8">
                <SignUp
                  appearance={{
                    variables: {
                      colorPrimary: "#04209d",
                      borderRadius: "12px",
                      fontFamily: "inherit",
                    },
                    elements: {
                      rootBox: "w-full",
                      cardBox: "shadow-none border-0 bg-transparent p-0",
                      card: "shadow-none border-0 bg-transparent p-0 w-full",
                      header: "hidden",
                      footer: "hidden",

                      socialButtonsBlock: "gap-3",
                      socialButtonsButton:
                        "h-11 rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50",

                      dividerLine: "bg-gray-200",
                      dividerText: "text-gray-500 text-xs",

                      formFieldLabel:
                        "text-xs font-semibold text-gray-700",
                      formFieldInput:
                        "h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-[#04209d]/20",

                      formButtonPrimary:
                        "mt-2 h-12 w-full rounded-full bg-[#04209d] text-white font-semibold hover:bg-[#03185a]",

                      footerAction:
                        "text-center text-sm text-gray-600",
                      footerActionLink:
                        "text-[#04209d] font-semibold hover:underline",
                    },
                    layout: {
                      socialButtonsPlacement: "top",
                      socialButtonsVariant: "blockButton",
                      showOptionalFields: true,
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}