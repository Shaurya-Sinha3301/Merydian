"use client";

import React from 'react';

export const TopNav = ({ setIsMobileOpen }: any) => (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
            <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:text-indigo-600"
            >
                <i className="fas fa-bars text-xl"></i>
            </button>
            <div className="relative w-48 md:w-96">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                />
            </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
            <button className="relative text-slate-500 hover:text-indigo-600 transition-colors">
                <i className="far fa-bell text-lg md:text-xl"></i>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">3</span>
            </button>
            <div className="hidden md:block h-8 w-[1px] bg-slate-200"></div>
            <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Active Agent</span>
                <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Online</div>
            </div>
        </div>
    </header>
);
