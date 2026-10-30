'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'traveller' | 'agent';
    family_id?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string, role: 'traveller' | 'agent') => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Initialize auth state from stored token
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const profile = await authService.getUserProfile();
                    setUser(profile);
                } catch (e) {
                    // Token invalid, try to refresh
                    const refreshed = await refreshToken();
                    if (!refreshed) {
                        localStorage.removeItem('access_token');
                    }
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    // Auto-refresh token before expiration
    useEffect(() => {
        if (!user) return;

        // Refresh token every 25 minutes (before 30 min expiration)
        const interval = setInterval(async () => {
            await refreshToken();
        }, 25 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user]);

    const login = useCallback(async (email: string, password: string) => {
        try {
            await authService.login(email, password);

            // Fetch and set user
            const profile = await authService.getUserProfile();
            setUser(profile);

            // Redirect based on role
            if (profile.role === 'agent') {
                router.push('/agent-dashboard');
            } else {
                router.push('/customer-dashboard');
            }
        } catch (error: unknown) {
            console.error('Login failed:', error);
            throw new Error(((error as Error).message || "") || 'Login failed');
        }
    }, [router]);

    const signup = useCallback(async (
        email: string,
        password: string,
        fullName: string,
        role: 'traveller' | 'agent'
    ) => {
        try {
            await authService.signup({
                email,
                password,
                full_name: fullName,
                role,
            });

            // Fetch and set user
            const profile = await authService.getUserProfile();
            setUser(profile);

            // Redirect based on role
            if (role === 'agent') {
                router.push('/agent-dashboard');
            } else {
                router.push('/customer-dashboard');
            }
        } catch (error: unknown) {
            console.error('Signup failed:', error);
            throw new Error(((error as Error).message || "") || 'Signup failed');
        }
    }, [router]);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Clear local state regardless of API call success
            setUser(null);
            router.push('/login');
        }
    }, [router]);

    const refreshToken = useCallback(async (): Promise<boolean> => {
        try {
            await authService.refreshToken();

            // Fetch updated user data
            const profile = await authService.getUserProfile();
            setUser(profile);
            return true;
        } catch (error) {
            if (((error as {status?: number}).status) !== 401 && ((error as {status?: number}).status) !== 403) {
                console.error('Token refresh failed:', error);
            }
            // Clear auth state on refresh failure
            setUser(null);
            return false;
        }
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshToken,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
