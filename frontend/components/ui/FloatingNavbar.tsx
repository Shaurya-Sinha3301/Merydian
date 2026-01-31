"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
    { name: "Agent Portal", link: "/agent-dashboard" },
    { name: "Customer Portal", link: "/customer-trip-request" },
];

export function FloatingNavbar({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <div className={cn("fixed top-0 inset-x-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm", className)}>
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Left: Logo/Brand */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        M
                    </div>
                    <span className="font-heading font-bold text-xl text-primary tracking-tight">
                        Meili.ai
                    </span>
                </Link>

                {/* Middle: Modular Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navItems.map((item, idx) => {
                        const isActive = pathname.startsWith(item.link);
                        return (
                            <Link
                                key={`link=${idx}`}
                                href={item.link}
                                className={cn(
                                    "text-sm font-medium transition-all hover:text-primary relative py-1",
                                    isActive
                                        ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded-full"
                                        : "text-foreground/70 decoration-transparent"
                                )}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Right: CTA Button */}
                <Link
                    href="/auth/login"
                    className={cn(
                        "relative px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm",
                        "shadow-md shadow-primary/20",
                        "transition-transform hover:-translate-y-0.5 active:translate-y-0",
                        "flex items-center gap-2"
                    )}
                >
                    <span>Sign In</span>
                    <ChevronRightIcon className="w-4 h-4 text-white" />
                </Link>
            </div>
        </div>
    );
}

import { ChevronRightIcon } from "@heroicons/react/24/outline";
