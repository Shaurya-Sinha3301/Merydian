"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";



export function FloatingNavbar({ className }: { className?: string }) {
    const pathname = usePathname();

    // Determine current portal name based on path
    const isAgent = pathname.startsWith("/agent-");
    const isCustomer = pathname.startsWith("/customer-");
    const portalName = isAgent ? "Agent Portal" : isCustomer ? "Customer Portal" : "";

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

                {/* Middle: Links + Portal Name */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/about" className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
                        About Us
                    </Link>
                    <Link href="/contact" className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
                        Contact Us
                    </Link>

                    {/* Dynamic Portal Name */}
                    {portalName && (
                        <div className="h-4 w-px bg-neutral-300 mx-2" />
                    )}
                    {portalName && (
                        <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                            {portalName}
                        </span>
                    )}
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
