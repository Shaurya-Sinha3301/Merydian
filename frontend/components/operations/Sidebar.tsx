'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-plane-departure text-white text-sm"></i>
          </div>
          <span className="font-bold text-xl tracking-tight text-indigo-900">NomadOps</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link 
          href="/operations" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/operations') ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <i className="fas fa-th-large w-5"></i>
          <span>Dashboard</span>
        </Link>
        <Link 
          href="/operations/families" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/operations/families') ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <i className="fas fa-users w-5"></i>
          <span>Trips & Families</span>
        </Link>
        <Link 
          href="/operations/analytics" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/operations/analytics') ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <i className="fas fa-chart-pie w-5"></i>
          <span>Analytics</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">JD</div>
            <div>
              <p className="text-sm font-semibold">Jane Doe</p>
              <p className="text-xs text-slate-500">Sr. Ops Manager</p>
            </div>
          </div>
          <button className="w-full text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-2">
            <i className="fas fa-cog"></i> Settings
          </button>
        </div>
      </div>
    </div>
  );
}
