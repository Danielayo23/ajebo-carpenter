'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import Image from "next/image";

export default function CustomerHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: 'Home', href: '/' },
    { label: 'Product Catalog', href: '/products' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
          src="/AJEBO LOGO jpg_1.jpg"
          alt="Ajebo Carpenter Logo"
          width={120}
          height={20}
          priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <Link href="/sign-in">
              <User className="h-5 w-5" />
            </Link>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <Link href="/cart">
            <ShoppingCart className="h-5 w-5" />
          </Link>

          {/* Hamburger for mobile */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-6 py-3 border-b"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
