'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'Analytics', href: '#analytics' },
    { name: 'AI Support', href: '#ai-support' },
    { name: 'Pricing', href: '#pricing' },
  ];

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out backdrop-blur-md rounded-full flex items-center justify-between border border-white/10 ${!scrolled
          ? 'w-[95%] max-w-7xl py-4 px-8 bg-black/20'
          : 'w-[80%] max-w-5xl py-3 px-6 bg-black/60'
        }`}
    >
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2 group">
          <motion.svg
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-8 h-8 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </motion.svg>
          <span className="text-xl font-serif tracking-tight text-white">Merydian</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-xs font-light uppercase tracking-[0.2em] text-white/70">
          {navItems.map((item, idx) => (
            <motion.a
              key={item.name}
              href={item.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + idx * 0.1 }}
              className="hover:text-white transition-colors relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </motion.a>
          ))}
        </nav>
      </div>
      <div className="flex gap-4">
        <Link
          href="/customer-login"
          className="bg-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full text-xs font-light uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300"
        >
          Login as Customer
        </Link>
        <Link
          href="/agent-login"
          className="bg-white text-black px-6 py-2 rounded-full text-xs font-light uppercase tracking-[0.2em] hover:bg-amber-400 hover:scale-105 transition-all duration-300"
        >
          Login as Agent
        </Link>
      </div>
    </motion.header>
  );
}