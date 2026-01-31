'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-2xl shadow-slate-900/10 px-3 py-3">
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-2 border-r border-slate-200">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-plane-departure text-white text-xs"></i>
          </div>
          <span className="font-bold text-sm tracking-tight text-indigo-900 hidden sm:block">NomadOps</span>
        </div>

        {/* Navigation Links */}
        <Link 
          href="/operations" 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/operations') && pathname === '/operations'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-chart-line"></i>
          <span className="hidden sm:inline">Analytics</span>
        </Link>

        <Link 
          href="/operations/customers" 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/operations/customers')
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-users"></i>
          <span className="hidden sm:inline">Customers</span>
        </Link>

        <Link 
          href="/operations/agents" 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${
            isActive('/operations/agents')
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-robot"></i>
          <span className="hidden sm:inline">Agents</span>
        </Link>

        {/* User Menu */}
        <div className="flex items-center gap-2 px-3 py-2 border-l border-slate-200 ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
            JD
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fas fa-chevron-down text-xs"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}
