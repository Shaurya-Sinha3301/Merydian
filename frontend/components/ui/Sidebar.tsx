"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    ChartBarIcon,
    AdjustmentsHorizontalIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";

interface SidebarItem {
    label: string;
    href?: string;
    count?: number;
    children?: SidebarItem[];
}

const sidebarStructure: {
    label: string;
    icon: React.ElementType;
    children?: SidebarItem[];
    href?: string;
}[] = [
        {
            label: "Dashboard",
            icon: AdjustmentsHorizontalIcon,
            href: "/agent-dashboard/itinerary-management",
        },
        {
            label: "Data Analytics",
            icon: ChartBarIcon,
            href: "/analytics",
        },
    ];

export function Sidebar({
    className,
    collapsed = false,
}: {
    className?: string;
    collapsed?: boolean;
}) {
    const pathname = usePathname();
    const [openSections, setOpenSections] = useState<string[]>([]);

    const toggleSection = (label: string) => {
        setOpenSections((prev) =>
            prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        );
    };

    // Longest-match active href
    const activeHref = React.useMemo(() => {
        const hrefs: string[] = [];
        const traverse = (items: typeof sidebarStructure) => {
            items.forEach((item) => {
                if (item.href) hrefs.push(item.href);
                if (item.children) traverse(item.children as any);
            });
        };
        traverse(sidebarStructure);
        const matches = hrefs.filter((href) => pathname.startsWith(href));
        matches.sort((a, b) => b.length - a.length);
        return matches[0] || "";
    }, [pathname]);

    return (
        <aside
            className={cn(
                "h-full bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300",
                collapsed ? "w-16" : "w-64",
                className
            )}
        >
            {/* ── Logo / Brand ─────────────────────────────────────────────── */}
            <div className={cn("pt-10 pb-8", collapsed ? "px-4" : "px-8")}>
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                    V
                </div>
                {!collapsed && (
                    <p className="text-[10px] mt-3 font-medium tracking-widest text-gray-400 uppercase">
                        Voyageur Portal
                    </p>
                )}
            </div>

            {/* ── Navigation ───────────────────────────────────────────────── */}
            <nav className={cn("flex-1 flex flex-col", collapsed ? "px-2" : "")}>
                {sidebarStructure.map((item) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isOpen = openSections.includes(item.label);
                    const isActive = !hasChildren && item.href && item.href === activeHref;

                    return (
                        <div key={item.label}>
                            {/* Top-level item */}
                            <div
                                onClick={() => hasChildren && toggleSection(item.label)}
                                className={cn(
                                    "group flex items-center gap-3 py-2 cursor-pointer select-none transition-colors duration-150",
                                    collapsed ? "justify-center px-2 mb-3" : "px-8 mb-1",
                                    isActive
                                        ? // Active: bold black text, right-side border indicator
                                        "text-black font-medium"
                                        : "text-gray-400 font-light hover:text-black"
                                )}
                                title={collapsed ? item.label : undefined}
                                style={
                                    isActive && !collapsed
                                        ? {
                                            borderRight: "2px solid black",
                                            marginRight: "-1px",
                                        }
                                        : {}
                                }
                            >
                                {item.href && !hasChildren ? (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 flex-1",
                                            collapsed && "justify-center"
                                        )}
                                    >
                                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                                        {!collapsed && (
                                            <span className="text-xs uppercase tracking-wider">
                                                {item.label}
                                            </span>
                                        )}
                                    </Link>
                                ) : (
                                    <div
                                        className={cn(
                                            "flex items-center gap-3 flex-1",
                                            collapsed && "justify-center"
                                        )}
                                    >
                                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                                        {!collapsed && (
                                            <span className="text-xs uppercase tracking-wider">
                                                {item.label}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {!collapsed && hasChildren && (
                                    <ChevronDownIcon
                                        className={cn(
                                            "w-3.5 h-3.5 transition-transform duration-200",
                                            isOpen ? "rotate-180" : ""
                                        )}
                                    />
                                )}
                            </div>

                            {/* Children */}
                            {!collapsed && hasChildren && isOpen && (
                                <div className="pl-12 pr-8 mt-1 mb-2 space-y-1">
                                    {item.children!.map((child) => {
                                        const isChildActive = pathname.startsWith(child.href || "###");
                                        return (
                                            <Link
                                                key={child.label}
                                                href={child.href || "#"}
                                                className={cn(
                                                    "flex items-center justify-between py-2 text-xs uppercase tracking-wider transition-colors duration-150",
                                                    isChildActive
                                                        ? "text-black font-medium"
                                                        : "text-gray-400 font-light hover:text-black"
                                                )}
                                            >
                                                <span>{child.label}</span>
                                                {child.count && (
                                                    <span
                                                        className={cn(
                                                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                            child.count === 3
                                                                ? "bg-orange-100 text-orange-600"
                                                                : child.count === 8
                                                                    ? "bg-emerald-100 text-emerald-600"
                                                                    : "bg-neutral-200 text-neutral-600"
                                                        )}
                                                    >
                                                        {child.count}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* ── Footer — operator caption ─────────────────────────────────── */}
            <div className={cn("pb-10", collapsed ? "px-4" : "px-8")}>
                {!collapsed ? (
                    <p className="text-[10px] font-medium text-gray-300 uppercase tracking-widest">
                        Operator: AGENT_04
                    </p>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mx-auto">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pro"
                            alt="Agent"
                        />
                    </div>
                )}
            </div>
        </aside>
    );
}
