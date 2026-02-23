'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CustomerLoginInteractive = () => {
  const router = useRouter();
  const [familyId, setFamilyId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate family ID format (FAM followed by 3 digits)
    const familyIdPattern = /^FAM\d{3}$/i;
    if (!familyIdPattern.test(familyId.toUpperCase())) {
      setError('Invalid Family ID format. Use format: FAM001');
      setIsLoading(false);
      return;
    }

    // For now, accept any password
    if (!password) {
      setError('Please enter a password');
      setIsLoading(false);
      return;
    }

    // Store family ID in session storage and redirect
    setTimeout(() => {
      sessionStorage.setItem('familyId', familyId.toUpperCase());
      router.push('/customer-portal');
    }, 1000);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] bg-white border border-[var(--bp-border)] p-12 shadow-sm flex flex-col relative overflow-hidden">

        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--bp-border)] to-transparent opacity-50"></div>

        {/* Status Indicator */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[var(--bp-sage)] rounded-full animate-pulse" />
          <span className="text-[8px] font-bold text-[var(--bp-muted)] tracking-[0.2em] uppercase">SYSTEM READY</span>
        </div>

        {/* Logo Section */}
        <div className="flex flex-col items-center mt-2 mb-10">
          <div className="w-12 h-12 bg-black flex items-center justify-center mb-4 border border-[var(--bp-border)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div className="text-center flex flex-col gap-0.5">
            <span className="text-[9px] font-bold tracking-[0.3em] text-black">VOYAGEUR</span>
            <span className="text-[8px] font-medium tracking-[0.2em] text-[var(--bp-muted)]">STUDIOS</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-xl font-light tracking-widest text-[#111111] leading-relaxed uppercase">
            Customer Portal<br />
            Login with your Family ID
          </h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="group">
            <div className="flex justify-between items-end mb-2">
              <label className="bp-label mb-0 block">
                FAMILY ID
              </label>
              <span className="text-[9px] font-mono text-[var(--bp-muted)] uppercase tracking-widest block pt-0.5">
                EX: FAM001
              </span>
            </div>
            <input
              type="text"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              placeholder="ENTER ID"
              className="w-full py-2 bg-transparent text-black text-sm border-b border-[var(--bp-border)] focus:border-black outline-none transition-colors placeholder:text-gray-300 placeholder:tracking-widest uppercase tracking-wide"
            />
          </div>

          <div className="group">
            <label className="bp-label mb-2 block">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-2 bg-transparent text-black text-lg font-mono tracking-widest border-b border-[var(--bp-border)] focus:border-black outline-none transition-colors placeholder:text-gray-300"
            />
          </div>

          {error && (
            <div className="py-2 border-l-2 border-[var(--bp-red)] pl-3">
              <p className="text-[10px] font-bold text-[var(--bp-red)] tracking-wider uppercase">{error}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-black text-white text-[10px] tracking-[0.2em] font-bold hover:bg-[var(--bp-sage)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>LOGGING IN...</span>
                </>
              ) : (
                'LOGIN'
              )}
            </button>
          </div>
        </form>

        {/* Footer metadata */}
        <div className="mt-12 pt-6 border-t border-[var(--bp-border)]/50 text-center flex flex-col gap-4">
          <p className="text-[8px] font-mono tracking-[0.1em] text-[var(--bp-muted)] uppercase">
            Don't know your Family ID? <a href="#" className="text-black hover:underline">Contact your travel agent.</a>
          </p>
          <div className="flex justify-center">
            <Link
              href="/"
              className="text-[9px] font-bold text-[var(--bp-muted)] hover:text-black transition-colors flex items-center gap-1.5 tracking-widest uppercase"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Return to Hub
            </Link>
          </div>
        </div>

        {/* Demo IDs mapping cleanly */}
        <div className="mt-6 pt-4 border-t border-[var(--bp-border)] border-dashed">
          <p className="text-[9px] font-bold tracking-widest text-[var(--bp-muted)] uppercase mb-3">Allowed Demo IDs</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-black font-semibold">FAM001</span>
              <span className="text-[var(--bp-muted)]">Sharma (Goa)</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-black font-semibold">FAM007</span>
              <span className="text-[var(--bp-muted)]">Khan (Manali)</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-black font-semibold">FAM012</span>
              <span className="text-[var(--bp-muted)]">Nair (Kerala)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginInteractive;
