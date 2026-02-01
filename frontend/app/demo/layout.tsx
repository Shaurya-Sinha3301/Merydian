"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/demo/Sidebar';
import { TopNav } from '@/components/demo/TopNav';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Auto-collapse based on window width
    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                if (window.innerWidth < 1024) setIsCollapsed(true);
                else setIsCollapsed(false);
            }
        };

        // Initial check
        if (typeof window !== 'undefined') {
            handleResize();
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <TopNav setIsMobileOpen={setIsMobileOpen} />
                <main className="flex-1 overflow-auto custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
