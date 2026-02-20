'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../services/api';

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

    // Decode JWT to extract user info
    const decodeToken = (token: string): User | null => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const payload = JSON.parse(jsonPayload);
            
            return {
                id: payload.sub,
                email: '', // Will be fetched from profile endpoint if needed
                full_name: '', // Will be fetched from profile endpoint if needed
                role: payload.role,
                family_id: payload.family_id,
            };
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    };

    // Initialize auth state from stored token
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                apiClient.setToken(token);
                const userData = decodeToken(token);
                if (userData) {
                    setUser(userData);
                } else {
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
            const response = await apiClient.login(email, password);
            
            // Store access token
            localStorage.setItem('access_token', response.access_token);
            apiClient.setToken(response.access_token);
            
            // Decode and set user
            const userData = decodeToken(response.access_token);
            if (userData) {
                setUser(userData);
                
                // Redirect based on role
                if (userData.role === 'agent') {
                    router.push('/agent-dashboard');
                } else {
                    router.push('/customer-dashboard');
                }
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            throw new Error(error.message || 'Login failed');
        }
    }, [router]);

    const signup = useCallback(async (
        email: string,
        password: string,
        fullName: string,
        role: 'traveller' | 'agent'
    ) => {
        try {
            const response = await apiClient.signup({
                email,
                password,
                full_name: fullName,
                role,
            });
            
            // Store access token
            localStorage.setItem('access_token', response.access_token);
            apiClient.setToken(response.access_token);
            
            // Decode and set user
            const userData = decodeToken(response.access_token);
            if (userData) {
                setUser(userData);
                
                // Redirect based on role
                if (role === 'agent') {
                    router.push('/agent-dashboard');
                } else {
                    // New customers go to preferences first
                    router.push('/customer-preferences');
                }
            }
        } catch (error: any) {
            console.error('Signup failed:', error);
            throw new Error(error.message || 'Signup failed');
        }
    }, [router]);

    const logout = useCallback(async () => {
        try {
            await apiClient.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Clear local state regardless of API call success
            localStorage.removeItem('access_token');
            apiClient.clearToken();
            setUser(null);
            router.push('/login');
        }
    }, [router]);

    const refreshToken = useCallback(async (): Promise<boolean> => {
        try {
            const response = await apiClient.refreshToken();
            
            // Store new access token
            localStorage.setItem('access_token', response.access_token);
            apiClient.setToken(response.access_token);
            
            // Update user data
            const userData = decodeToken(response.access_token);
            if (userData) {
                setUser(userData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Clear auth state on refresh failure
            localStorage.removeItem('access_token');
            apiClient.clearToken();
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
