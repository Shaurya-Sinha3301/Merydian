'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'traveller' | 'agent';
    redirectTo?: string;
}

export default function ProtectedRoute({
    children,
    requiredRole,
    redirectTo = '/login',
}: ProtectedRouteProps) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            // Not authenticated, redirect to login
            router.push(redirectTo);
            return;
        }

        if (requiredRole && user?.role !== requiredRole) {
            // Wrong role, redirect to appropriate dashboard
            if (user?.role === 'agent') {
                router.push('/agent-dashboard');
            } else {
                router.push('/customer-dashboard');
            }
        }
    }, [isAuthenticated, isLoading, user, requiredRole, redirectTo, router]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#212121]"></div>
                    <p className="mt-4 text-[#212121]/70">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated or wrong role
    if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
        return null;
    }

    // Authenticated and authorized
    return <>{children}</>;
}
