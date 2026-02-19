"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Squares2X2Icon, // Dashboard
    ChartBarIcon, // Analytics
    AdjustmentsHorizontalIcon, // Optimizer
    ChevronDownIcon,
    ChevronRightIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface SidebarItem {
    label: string;
    href?: string;
    count?: number;
    children?: SidebarItem[];
}

interface SidebarSection {
    title?: string; // Optional main headers
    items: SidebarItem[]; // Using flat list at top level, with children for nesting
}

// Data Structure matching the reference image hierarchy
const sidebarStructure: { label: string; icon: React.ElementType; children?: SidebarItem[]; href?: string; isOpen?: boolean }[] = [
    {
        label: "Dashboard Group Info",
        icon: Squares2X2Icon,
        href: "/agent-dashboard"
    },
    {
        label: "Optimizer Window",
        icon: AdjustmentsHorizontalIcon,
        href: "/agent-dashboard/itinerary-management"
    },
    {
        label: "Data Analytics",
        icon: ChartBarIcon,
        href: "/analytics"
    },
];

export function Sidebar({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
    const pathname = usePathname();
    const [openSections, setOpenSections] = useState<string[]>(["Product"]); // Default open section

    const toggleSection = (label: string) => {
        setOpenSections(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };

    return (
        <aside
            className={cn(
                "h-full bg-background border-r border-neutral-200 flex flex-col shrink-0 transition-all duration-300",
                collapsed ? "w-16" : "w-64",
                className
            )}
        >
            {/* Spacer for Top Navbar (64px) */}
            <div className="h-4" />

            {/* Navigation Tree */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {sidebarStructure.map((item) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isOpen = openSections.includes(item.label);
                    const isSingleActive = !hasChildren && item.href && pathname.startsWith(item.href);

                    return (
                        <div key={item.label}>
                            <div
                                onClick={() => hasChildren && toggleSection(item.label)}
                                className={cn(
                                    "group flex items-center justify-between px-2 py-2.5 rounded-xl cursor-pointer transition-all select-none mb-1",
                                    collapsed ? "justify-center" : "",
                                    isSingleActive
                                        ? "bg-white shadow-sm text-foreground font-bold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-black/5",
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                {item.href && !hasChildren ? (
                                    <Link href={item.href} className={cn("flex items-center gap-3 flex-1", collapsed && "justify-center")}>
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        {!collapsed && <span className="text-sm">{item.label}</span>}
                                    </Link>
                                ) : (
                                    <div className={cn("flex items-center gap-3 flex-1", collapsed && "justify-center")}>
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                                    </div>
                                )}

                                {!collapsed && hasChildren && (
                                    <ChevronDownIcon className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                                )}
                            </div>

                            {/* Children — hidden when collapsed */}
                            {!collapsed && hasChildren && isOpen && (
                                <div className="pl-4 ml-2.5 border-l-2 border-neutral-200 mt-1 space-y-1">
                                    {item.children!.map((child) => {
                                        const isChildActive = pathname.startsWith(child.href || '###');
                                        return (
                                            <Link
                                                key={child.label}
                                                href={child.href || '#'}
                                                className={cn(
                                                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all",
                                                    isChildActive
                                                        ? "bg-white shadow-sm text-foreground font-bold"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                                                )}
                                            >
                                                <span>{child.label}</span>
                                                {child.count && (
                                                    <span className={cn(
                                                        "text-[11px] font-bold px-2 py-0.5 rounded-md",
                                                        child.count === 3 ? "bg-orange-100 text-orange-600" :
                                                            child.count === 8 ? "bg-emerald-100 text-emerald-600" :
                                                                "bg-neutral-200 text-neutral-600"
                                                    )}>
                                                        {child.count}
                                                    </span>
                                                )}
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer User */}
            <div className="p-3 border-t border-neutral-200">
                <div className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 cursor-pointer", collapsed && "justify-center")}>
                    <div className="w-8 h-8 rounded-full bg-neutral-300 overflow-hidden shrink-0">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pro" alt="User" />
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">Admin User</p>
                                <p className="text-xs text-muted-foreground">Pro Plan</p>
                            </div>
                            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                        </>
                    )}
                </div>
            </div>

        </aside>
    );
}
