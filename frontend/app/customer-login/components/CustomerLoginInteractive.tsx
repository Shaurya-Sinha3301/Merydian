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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#FDFDFF] rounded-3xl p-8 shadow-[16px_16px_32px_rgba(0,0,0,0.1),-16px_-16px_32px_rgba(255,255,255,0.9)]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#212121] shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.7)] flex items-center justify-center">
            <svg className="w-10 h-10 text-[#FDFDFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#212121] mb-2">Customer Portal</h1>
          <p className="text-[#212121]/60">Login with your Family ID</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#212121] mb-2">
              Family ID
            </label>
            <input
              type="text"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              placeholder="FAM001"
              className="w-full px-4 py-3 bg-[#EDEDED] text-[#212121] rounded-xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] focus:outline-none placeholder:text-[#212121]/40"
            />
            <p className="text-xs text-[#212121]/40 mt-2">Format: FAM001, FAM002, etc.</p>
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
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#212121]/60 mb-4">
            Don't know your Family ID? Contact your travel agent.
          </p>
          <Link
            href="/"
            className="text-sm text-[#212121]/70 hover:text-[#212121] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Demo IDs */}
        <div className="mt-6 p-4 bg-[#EDEDED] rounded-xl">
          <p className="text-xs font-semibold text-[#212121] mb-2">Demo Family IDs:</p>
          <div className="space-y-1">
            <p className="text-xs text-[#212121]/60">• FAM001 - Sharma Family (Goa)</p>
            <p className="text-xs text-[#212121]/60">• FAM007 - Khan Family (Manali)</p>
            <p className="text-xs text-[#212121]/60">• FAM012 - Nair Family (Kerala)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginInteractive;
