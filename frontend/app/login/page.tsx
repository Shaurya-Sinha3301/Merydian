'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [userType, setUserType] = useState<'customer' | 'agent'>('customer');

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
          <p className="text-[#212121]/70">Choose your login type to continue</p>
        </div>

        {/* User Type Selection */}
        <div className="flex bg-[#EDEDED] rounded-2xl p-1 mb-8">
          <button
            onClick={() => setUserType('customer')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${userType === 'customer'
              ? 'bg-[#FDFDFF] text-[#212121] shadow-sm'
              : 'text-[#212121]/70 hover:text-[#212121]'
              }`}
          >
            Customer
          </button>
          <button
            onClick={() => setUserType('agent')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${userType === 'agent'
              ? 'bg-[#FDFDFF] text-[#212121] shadow-sm'
              : 'text-[#212121]/70 hover:text-[#212121]'
              }`}
          >
            Travel Agent
          </button>
        </div>

        {/* Login Form */}
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#212121] mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-[#EDEDED] border border-[#EDEDED] rounded-xl text-[#212121] placeholder-[#212121]/50 focus:outline-none focus:ring-2 focus:ring-[#212121] focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#212121] mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-[#EDEDED] border border-[#EDEDED] rounded-xl text-[#212121] placeholder-[#212121]/50 focus:outline-none focus:ring-2 focus:ring-[#212121] focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-[#EDEDED] text-[#212121] focus:ring-[#212121]" />
              <span className="ml-2 text-sm text-[#212121]/70">Remember me</span>
            </label>
            <a href="#" className="text-sm text-[#212121] hover:text-[#212121]/70">
              Forgot password?
            </a>
          </div>

          {userType === 'customer' ? (
            <Link
              href="/customer-login"
              className="w-full bg-[#212121] text-[#FDFDFF] py-3 px-4 rounded-xl font-bold hover:bg-[#212121]/90 transition-all text-center block"
            >
              Login to Customer Portal
            </Link>
          ) : (
            <Link
              href="/agent-dashboard"
              className="w-full bg-[#212121] text-[#FDFDFF] py-3 px-4 rounded-xl font-bold hover:bg-[#212121]/90 transition-all text-center block"
            >
              Login to Agent Portal
            </Link>
          )}
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