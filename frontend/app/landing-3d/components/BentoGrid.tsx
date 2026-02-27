'use client';

import Link from 'next/link';

export default function BentoGrid() {
  return (
    <section className="relative z-10 w-full bg-[#0c0c0c] py-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-white text-5xl md:text-7xl mb-6 text-center">
          Why Choose Merydian
        </h2>
        <p className="text-white/60 text-center max-w-2xl mx-auto mb-20 font-sans text-lg">
          Powerful features for travelers and agents alike
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* For Travelers */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-white font-serif text-2xl mb-3">Guided Trip Requests</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Fill out simple forms with your preferences, and let AI create personalized base
              itineraries instantly.
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-white font-serif text-2xl mb-3">Natural Language Changes</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Request modifications like &quot;add a beach day&quot; and see instant cost and time
              impacts.
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-white font-serif text-2xl mb-3">Interactive Itineraries</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              View your trip as beautiful timelines. Accept or reject changes with one click.
            </p>
          </div>

          {/* For Travel Agents */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-white font-serif text-2xl mb-3">Multi-Group Management</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Handle multiple families simultaneously with individual preferences and booking status.
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-white font-serif text-2xl mb-3">AI Re-optimization</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              When disruptions occur, AI instantly finds alternatives that maximize satisfaction and
              profit.
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] rounded-3xl p-8 border border-white/10 hover:border-amber-400/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-white font-serif text-2xl mb-3">Real-time Analytics</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Track performance, satisfaction, and revenue across all managed trips with
              comprehensive dashboards.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h3 className="font-serif text-white text-4xl md:text-5xl mb-6">
            Ready to Transform Travel Planning?
          </h3>
          <p className="text-white/60 max-w-2xl mx-auto mb-10 text-lg">
            Join thousands creating exceptional travel experiences with AI-powered collaboration.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/customer-login"
              className="bg-white text-black px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-amber-400 transition-all hover:scale-105"
            >
              Login as Customer
            </Link>
            <Link
              href="/agent-login"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all hover:scale-105"
            >
              Login as Travel Agent
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
