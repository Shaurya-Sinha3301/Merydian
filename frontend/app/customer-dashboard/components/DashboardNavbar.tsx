'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, Search, Settings, LogOut, User } from 'lucide-react';

export default function DashboardNavbar() {
    const [notificationCount] = useState(3);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-[1920px] mx-auto px-6 py-4">
                <div className="flex items-center justify-between">

                    {/* Logo & Brand */}
                    <div className="flex items-center gap-8">
                        <Link href="/customer-dashboard" className="flex items-center gap-2">
                            <svg className="w-8 h-8 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="text-2xl font-black tracking-tight text-gray-900">Meili AI</span>
                        </Link>

                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="/customer-dashboard" className="text-sm font-semibold text-gray-900">
                                Dashboard
                            </Link>
                            <Link href="/my-trips" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                My Trips
                            </Link>
                            <Link href="/customer-dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                Bookings
                            </Link>
                            <Link href="/customer-dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                Help
                            </Link>
                        </div>
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center gap-4">

                        {/* Search */}
                        <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 w-64">
                            <Search className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search trips..."
                                className="bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500 w-full"
                            />
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Bell className="w-5 h-5 text-gray-700" />
                            {notificationCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {notificationCount}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        <div className="relative group">
                            <button className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
                                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    MS
                                </div>
                                <div className="hidden md:block text-left">
                                    <div className="text-sm font-semibold text-gray-900">Matt Smith</div>
                                    <div className="text-xs text-gray-500">Customer</div>
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                <Link href="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                                    <User className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm text-gray-900">Profile</span>
                                </Link>
                                <Link href="/settings" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                                    <Settings className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm text-gray-900">Settings</span>
                                </Link>
                                <hr className="my-2 border-gray-200" />
                                <button className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors w-full text-left">
                                    <LogOut className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm text-gray-900">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
