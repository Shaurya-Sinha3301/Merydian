'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupPage() {
    const { signup } = useAuth();
    const [userType, setUserType] = useState<'customer' | 'agent'>('customer');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Basic validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match!');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        try {
            await signup(
                formData.email,
                formData.password,
                formData.name,
                userType === 'agent' ? 'agent' : 'traveller'
            );
            // Redirect is handled by AuthContext based on user role
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-white bp-grid-bg">
            <div className="w-full max-w-[440px] bg-white border border-[var(--bp-border)] p-12 shadow-sm flex flex-col relative overflow-hidden">

                {/* Decorative Top Line */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--bp-border)] to-transparent opacity-50"></div>

                {/* Status Indicator */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[var(--bp-sage)] rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-bold text-[var(--bp-muted)] tracking-[0.2em] uppercase">SYSTEM READY</span>
                </div>

                {/* Logo Section */}
                <div className="flex flex-col items-center mt-2 mb-10">
                    <div className="w-12 h-12 bg-black flex items-center justify-center mb-4 border border-[var(--bp-border)]">
                        <span className="text-white text-xl font-light tracking-widest">V</span>
                    </div>
                    <div className="text-center flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold tracking-[0.3em] text-black">VOYAGEUR</span>
                        <span className="text-[8px] font-medium tracking-[0.2em] text-[var(--bp-muted)]">SIGNUP</span>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8 flex flex-col gap-2">
                    <h1 className="text-xl font-light tracking-[0.15em] text-[#111111] leading-relaxed uppercase">
                        Create Account
                    </h1>
                    <p className="text-sm font-medium tracking-[0.1em] text-[var(--bp-muted)] uppercase">
                        Join to start planning
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="py-2 border-l-2 border-[var(--bp-red)] pl-3 mb-6">
                        <p className="text-[10px] font-bold text-[var(--bp-red)] tracking-wider uppercase">{error}</p>
                    </div>
                )}

                {/* User Type Selection */}
                <div className="flex border border-[var(--bp-border)] p-1 mb-8">
                    <button
                        type="button"
                        onClick={() => setUserType('customer')}
                        className={`flex-1 py-3 px-4 text-[10px] tracking-[0.15em] font-bold transition-colors uppercase ${userType === 'customer'
                            ? 'bg-black text-white'
                            : 'bg-transparent text-[var(--bp-muted)] hover:text-black'
                            }`}
                    >
                        CUSTOMER
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserType('agent')}
                        className={`flex-1 py-3 px-4 text-[10px] tracking-[0.15em] font-bold transition-colors uppercase ${userType === 'agent'
                            ? 'bg-black text-white'
                            : 'bg-transparent text-[var(--bp-muted)] hover:text-black'
                            }`}
                    >
                        AGENT
                    </button>
                </div>

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="group">
                        <label className="bp-label mb-2 block">
                            FULL NAME
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full py-2 bg-transparent text-black text-sm border-b border-[var(--bp-border)] focus:border-black outline-none transition-colors placeholder:text-gray-300 placeholder:tracking-widest uppercase tracking-wide"
                            placeholder="JOHN DOE"
                        />
                    </div>

                    <div className="group">
                        <label className="bp-label mb-2 block">
                            EMAIL ADDRESS
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full py-2 bg-transparent text-black text-sm border-b border-[var(--bp-border)] focus:border-black outline-none transition-colors placeholder:text-gray-300 placeholder:tracking-widest uppercase tracking-wide"
                            placeholder="EMAIL@EXAMPLE.COM"
                        />
                    </div>

                    <div className="group">
                        <label className="bp-label mb-2 block">
                            PASSWORD
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full py-2 bg-transparent text-black text-lg font-mono tracking-widest border-b border-[var(--bp-border)] focus:border-black outline-none transition-colors placeholder:text-gray-300"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="group">
                        <label className="bp-label mb-2 block">
                            CONFIRM PASSWORD
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full py-2 bg-transparent text-black text-lg font-mono tracking-widest border-b border-[var(--bp-border)] focus:border-black outline-none transition-colors placeholder:text-gray-300"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                        <input
                            type="checkbox"
                            required
                            className="mt-1 appearance-none w-3.5 h-3.5 border border-[var(--bp-border)] checked:bg-black checked:border-black transition-colors cursor-pointer relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[3px] after:top-[1px] after:w-1.5 after:h-2 after:border-r-[1.5px] after:border-b-[1.5px] after:border-white after:rotate-45"
                        />
                        <span className="text-[9px] font-mono text-[var(--bp-muted)] tracking-widest leading-relaxed uppercase pt-[2px]">
                            I AGREE TO THE{' '}
                            <a href="#" className="text-black hover:underline font-bold">TERMS</a>{' '}
                            AND{' '}
                            <a href="#" className="text-black hover:underline font-bold">PRIVACY POLICY</a>
                        </span>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-black text-white text-[10px] tracking-[0.2em] font-bold hover:bg-[var(--bp-sage)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>CREATING ACCOUNT...</span>
                                </>
                            ) : (
                                `CREATE ${userType === 'customer' ? 'CUSTOMER' : 'AGENT'} ACCOUNT`
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer metadata */}
                <div className="mt-12 pt-6 border-t border-[var(--bp-border)]/50 text-center flex flex-col gap-4">
                    <p className="text-[8px] font-mono tracking-[0.1em] text-[var(--bp-muted)] uppercase">
                        ALREADY HAVE AN ACCOUNT? <Link href="/login" className="text-black hover:underline">SIGN IN</Link>
                    </p>
                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="text-[9px] font-bold text-[var(--bp-muted)] hover:text-black transition-colors flex items-center gap-1.5 tracking-widest uppercase"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            RETURN TO HUB
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
