'use client';

import Link from 'next/link';

export default function Footer3D() {
  return (
    <footer className="relative z-10 w-full bg-[#0c0c0c] border-t border-white/10 py-16 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-serif italic text-xl">
              M
            </div>
            <span className="text-white font-serif text-2xl font-bold tracking-widest">
              MERYDIAN
            </span>
          </div>

          <nav className="flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-white/70">
            <Link href="/customer-login" className="hover:text-white transition-colors">
              Customer Portal
            </Link>
            <Link href="/agent-login" className="hover:text-white transition-colors">
              Agent Portal
            </Link>
          </nav>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
          <p>© 2026 Merydian. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
