import Link from 'next/link';

export default function CustomerFooter() {
  return (
    <footer className="bg-[#04209d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold">Ajebo Carpenter</h3>
            <p className="mt-4 text-sm opacity-90">
              ajebocarpenter.com
              <br />
              +234 815 464 2381
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="mb-3 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link href="/products">Product</Link></li>
                <li><Link href="/info">Information</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
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
