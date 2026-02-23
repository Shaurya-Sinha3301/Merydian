'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header3D() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out rounded-full flex items-center justify-between backdrop-blur-md border border-white/10 ${
        !scrolled
          ? 'w-[95%] max-w-7xl py-4 px-8 bg-black/20'
          : 'w-[80%] max-w-5xl py-3 px-6 bg-black/60'
      }`}
    >
      <div className="flex items-center gap-12">
        <Link
          href="/"
          className="font-serif text-white font-bold tracking-widest text-xl flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-serif italic text-lg group-hover:bg-amber-400 transition-colors">
            M
          </div>
          <span>MEILI AI</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/customer-login"
          className="hidden md:block text-white text-sm font-semibold hover:text-amber-400 transition-colors px-4 py-2"
        >
          Login as Customer
        </Link>
        <Link
          href="/agent-login"
          className="bg-white text-black px-6 py-2 rounded-full font-sans text-sm font-semibold hover:scale-105 transition-transform hover:bg-amber-400 hover:text-white"
        >
          Login as Travel Agent
        </Link>
      </div>
    </header>
  );
}
