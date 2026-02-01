"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: any) => {
    const pathname = usePathname();
    const isActive = (path: string) => {
        // Exact match or sub-path match for nested routes
        if (path === '/demo' && pathname === '/demo') return true;
        if (path !== '/demo' && pathname?.startsWith(path)) return true;
        return false;
    };

    const NavItem = ({ to, icon, label }: any) => (
        <Link
            href={to}
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 overflow-hidden whitespace-nowrap ${isActive(to) ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
        >
            <i className={`fas ${icon} w-5 shrink-0 text-center`}></i>
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
        </Link>
    );

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div className={`
        fixed md:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 z-50 
        transition-all duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                            <i className="fas fa-plane-departure text-white text-sm"></i>
                        </div>
                        {!isCollapsed && <span className="font-bold text-xl tracking-tight text-indigo-900 truncate">NomadOps</span>}
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex w-6 h-6 items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <i className={`fas fa-angle-double-${isCollapsed ? 'right' : 'left'}`}></i>
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem to="/demo" icon="fa-th-large" label="Dashboard" />
                    <NavItem to="/demo/families" icon="fa-users" label="Trips & Families" />
                    <NavItem to="/demo/analytics" icon="fa-chart-pie" label="Analytics" />
                </nav>

                <div className="p-4 border-t border-slate-100 overflow-hidden">
                    <div className={`bg-slate-50 p-2 rounded-xl transition-all ${isCollapsed ? 'items-center' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">JD</div>
                            {!isCollapsed && (
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">Jane Doe</p>
                                    <p className="text-xs text-slate-500 truncate">Sr. Ops Manager</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
