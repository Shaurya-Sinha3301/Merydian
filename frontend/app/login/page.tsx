'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [userType, setUserType] = useState<'customer' | 'agent'>('customer');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      // Redirect is handled by AuthContext based on user role
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg className="w-8 h-8 text-[#212121]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-2xl font-black tracking-tight text-[#212121]">Meili AI</span>
          </div>
          <h1 className="text-3xl font-bold text-[#212121] mb-2">Welcome Back</h1>
          <p className="text-[#212121]/70">Sign in to continue your journey</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* User Type Selection */}
        <div className="flex bg-[#EDEDED] rounded-2xl p-1 mb-8">
          <button
            type="button"
            onClick={() => setUserType('customer')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              userType === 'customer'
                ? 'bg-[#FDFDFF] text-[#212121] shadow-sm'
                : 'text-[#212121]/70 hover:text-[#212121]'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setUserType('agent')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              userType === 'agent'
                ? 'bg-[#FDFDFF] text-[#212121] shadow-sm'
                : 'text-[#212121]/70 hover:text-[#212121]'
            }`}
          >
            Travel Agent
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#EDEDED] border border-[#EDEDED] rounded-xl text-[#212121] placeholder-[#212121]/50 focus:outline-none focus:ring-2 focus:ring-[#212121] focus:border-transparent"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212121] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-[#EDEDED] border border-[#EDEDED] rounded-xl text-[#212121] placeholder-[#212121]/50 focus:outline-none focus:ring-2 focus:ring-[#212121] focus:border-transparent"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="rounded border-[#EDEDED] text-[#212121] focus:ring-[#212121]"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-[#212121]/70">Remember me</span>
            </label>
            <a href="#" className="text-sm text-[#212121] hover:text-[#212121]/70">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-[#212121] text-[#FDFDFF] py-3 px-4 rounded-xl font-bold hover:bg-[#212121]/90 transition-all ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              `Sign in as ${userType === 'customer' ? 'Customer' : 'Agent'}`
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-[#212121]/70">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#212121] font-medium hover:text-[#212121]/70">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-[#212121]/70 hover:text-[#212121] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
