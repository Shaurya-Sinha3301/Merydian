'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const AgentLoginInteractive = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email || !password) {
            setError('Please enter both email and password');
            setIsLoading(false);
            return;
        }

        // Determine the target route based on email/role if needed, but for now hardcoded to itinerary-management
        const targetRoute = '/agent-dashboard/itinerary-management';

        setTimeout(() => {
            // Store standard session item for agents, for now we will just route to dashboard
            sessionStorage.setItem('agentEmail', email);
            router.push(targetRoute);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FDFDFF]">
            <div className="max-w-md w-full bg-[#FDFDFF] rounded-3xl p-8 shadow-[16px_16px_32px_rgba(0,0,0,0.1),-16px_-16px_32px_rgba(255,255,255,0.9)]">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#212121] shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.7)] flex items-center justify-center">
                        <svg className="w-10 h-10 text-[#FDFDFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-[#212121] mb-2">Agent Portal</h1>
                    <p className="text-[#212121]/60">Login with your credentials</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[#212121] mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@voyageur.com"
                            className="w-full px-4 py-3 bg-[#EDEDED] text-[#212121] rounded-xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] focus:outline-none placeholder:text-[#212121]/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#212121] mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-4 py-3 bg-[#EDEDED] text-[#212121] rounded-xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] focus:outline-none placeholder:text-[#212121]/40"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" className="rounded border-[#EDEDED] text-[#212121] focus:ring-[#212121]" />
                            <span className="ml-2 text-sm text-[#212121]/70">Remember me</span>
                        </label>
                        <a href="#" className="text-sm font-semibold text-[#212121] hover:text-[#212121]/70 transition-colors">
                            Forgot password?
                        </a>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-[#212121] text-[#FDFDFF] rounded-xl font-semibold hover:bg-[#212121]/90 transition-all shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.7)] disabled:opacity-50"
                    >
                        {isLoading ? 'Logging in...' : 'Login to Dashboard'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-[#212121]/70">
                        Don't have an agent account?{' '}
                        <Link href="/signup" className="text-[#212121] font-semibold hover:text-[#212121]/70 transition-colors">
                            Apply now
                        </Link>
                    </p>
                </div>

                {/* Return Text */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-sm text-[#212121]/70 hover:text-[#212121] flex items-center justify-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AgentLoginInteractive;
