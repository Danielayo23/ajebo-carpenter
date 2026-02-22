'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import Image from 'next/image';

export default function CustomerHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: 'Home', href: '/' },
    { label: 'Product Catalog', href: '/products' },
    { label: 'Contact', href: '/contact' },
  ];

  // Prevent menu staying open after resizing (mobile -> desktop)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/AJEBO LOGO jpg_1.jpg"
            alt="Ajebo Carpenter Logo"
            width={120}
            height={20}
            priority
            className="h-auto w-[110px] sm:w-[120px]"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm font-semibold text-gray-900 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[#04209d] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-2 sm:gap-4 text-gray-900">
          <SignedOut>
            <Link
              href="/sign-in"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-50"
              aria-label="Sign in"
            >
              <User className="h-5 w-5" />
            </Link>
          </SignedOut>

          <SignedIn>
            <div className="inline-flex items-center justify-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <Link
            href="/cart"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-50"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {/* Hamburger for mobile */}
          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-50"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-xl px-3 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}