import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, CheckCircle2, AlertCircle } from "lucide-react";

export default function CustomerFooter() {
  return (
    <footer className="bg-[#04209d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="mt-4 text-sm opacity-90">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/AJEBO LOGO jpg_1.jpg"
                alt="Ajebo Carpenter Logo"
                width={100}
                height={48}
                priority
              />
            </Link>

               <div className="space-y-3 py-3">
                <a
                  href="mailto:info@ajebocarpenter.com"
                  className="flex items-center gap-3  text-sm text-white transition-colors hover:text-[#c9d5e9]"
                >
                  <Mail size={18} className="text-white" />
                  <span>info@ajebocarpenter.com</span>
                </a>

                <a
                  href="tel:+2348154442381"
                  className="flex items-center gap-3 text-sm text-white transition-colors hover:text-[#c9d5e9]"
                >
                  <Phone size={18} className="text-white" />
                  <span>+234-815-444-2381</span>
                </a>
              </div>
            
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 ">
            <div>
              <h4 className="mb-3 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li className='hover:text-[#c9d5e9]'><Link href="/products">Product</Link></li>
                <li className='hover:text-[#c9d5e9]'><Link href="/info">Information</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li className='hover:text-[#c9d5e9]'><Link href="/about">About</Link></li>
                <li className='hover:text-[#c9d5e9]'><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
          </div>

          {/* Subscribe */}
          <div>
            <h4 className="mb- font-semibold">Subscribe</h4>
            <form className="flex ">
              <input
                type="email"
                placeholder="Get product updates"
                className="w-full rounded-l-md px-3 py-2 text-black bg-white 
                border-none focus:outline-none focus:ring-0 "
              />
              <button
                type="submit"
                className="rounded-r-md bg-black px-4"
              >
                →
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-6 text-center text-sm opacity-80">
          © {new Date().getFullYear()} Ajebo Carpenter
        </div>
      </div>
    </footer>
  );
}
