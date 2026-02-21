'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * 0.5;
        parallaxRef.current.style.transform = `translateY(${rate}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-[#FDFDFF] text-[#212121] font-sans antialiased">
      {/* Header */}
      <header className="fixed top-8 w-full z-50 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <svg className="w-8 h-8 text-[#212121]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-xl font-black tracking-tight">Meili AI</span>
          </a>
          <nav className="hidden md:flex items-center pill-nav gap-8 text-xs font-black uppercase tracking-widest text-[#212121]/70">
            <a href="#features" className="hover:text-[#212121] transition-colors">Features</a>
            <a href="#customer-experience" className="hover:text-[#212121] transition-colors">Customer Experience</a>
            <a href="#agent-tools" className="hover:text-[#212121] transition-colors">Agent Tools</a>
            <a href="#pricing" className="hover:text-[#212121] transition-colors">Pricing</a>
          </nav>
          <div className="flex gap-4">
            <Link href="/customer-login" className="bg-[#EDEDED] text-[#212121] px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#212121] hover:text-[#FDFDFF] transition-all">
              Login as Customer
            </Link>
            <Link href="/agent-login" className="bg-[#212121] text-[#FDFDFF] px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#EDEDED] hover:text-[#212121] transition-all">
              Login as Agent
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-screen min-h-[800px] flex items-center justify-center overflow-hidden">
          <div ref={parallaxRef} className="absolute inset-0 z-0 will-change-transform">
            <div className="w-full h-full bg-gradient-to-br from-[#FDFDFF] via-[#EDEDED]/30 to-[#FDFDFF]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#FDFDFF] via-transparent to-transparent"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10 text-center">
            <div className="space-y-12">
              <h1 className="text-6xl md:text-8xl font-serif font-semibold text-[#212121] leading-tight animate-fade-in-up">
                Intelligent Travel
                <br />
                <span className="italic text-[#212121]/70">Made Simple</span>
              </h1>
              <p className="text-xl md:text-2xl text-[#212121]/70 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animate-delay-200">
                AI-powered platform connecting travelers with expert agents. Create personalized itineraries,
                manage group bookings, and deliver exceptional travel experiences.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up animate-delay-400">
                <Link href="/customer-login" className="bg-[#212121] text-[#FDFDFF] px-8 py-4 rounded-full flex items-center gap-3 group hover:bg-[#212121]/90 transition-all text-sm font-black uppercase tracking-widest hover:scale-105 transform">
                  <span>Start Planning Your Trip</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/agent-login" className="bg-[#EDEDED] text-[#212121] px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:bg-[#212121] hover:text-[#FDFDFF] transition-all hover:scale-105 transform">
                  Agent Portal
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Experience Section */}
        <section id="customer-experience" className="py-32 bg-[#FDFDFF]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-serif mb-6 text-[#212121] leading-tight">
                For <span className="italic text-[#212121]/70">Travelers</span>
              </h2>
              <p className="text-xl text-[#212121]/70 max-w-3xl mx-auto">
                Experience seamless trip planning with AI-powered recommendations and real-time collaboration with expert travel agents.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Customer Feature 1 */}
              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED] hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in-up">
                <div className="w-16 h-16 bg-[#EDEDED] rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#212121]">Smart Trip Requests</h3>
                <p className="text-[#212121]/70 leading-relaxed">
                  Fill out guided forms with your preferences, budget, and group details. Our AI creates personalized base itineraries instantly.
                </p>
              </div>

              {/* Customer Feature 2 */}
              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED] hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in-up animate-delay-200">
                <div className="w-16 h-16 bg-[#EDEDED] rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#212121]">Real-time Collaboration</h3>
                <p className="text-[#212121]/70 leading-relaxed">
                  Request changes in natural language. See cost and time impacts instantly. Collaborate with agents to perfect your itinerary.
                </p>
              </div>

              {/* Customer Feature 3 */}
              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED] hover:shadow-xl transition-all hover:-translate-y-2 animate-fade-in-up animate-delay-400">
                <div className="w-16 h-16 bg-[#EDEDED] rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-[#212121]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[#212121]">Interactive Itineraries</h3>
                <p className="text-[#212121]/70 leading-relaxed">
                  View your trip as beautiful day-by-day timelines. Accept or reject changes with one click. Track costs and updates in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Tools Section */}
        <section id="agent-tools" className="py-32 bg-[#EDEDED]/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-serif mb-6 text-[#212121] leading-tight">
                For <span className="italic text-[#212121]/70">Travel Agents</span>
              </h2>
              <p className="text-xl text-[#212121]/70 max-w-3xl mx-auto">
                Powerful operational dashboard to manage multiple groups, optimize itineraries, and deliver exceptional service at scale.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 animate-slide-in-left">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#212121] flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-[#FDFDFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-[#212121]">Multi-Group Management</h3>
                      <p className="text-[#212121]/70">Handle multiple families and groups simultaneously. Track individual preferences, dietary requirements, and booking status.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#212121] flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-[#FDFDFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-[#212121]">AI Re-optimization</h3>
                      <p className="text-[#212121]/70">When disruptions occur, AI instantly finds alternatives that maximize both profit margins and customer satisfaction.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#212121] flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-[#FDFDFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-[#212121]">Real-time Analytics</h3>
                      <p className="text-[#212121]/70">Track performance, customer satisfaction, and revenue across all your managed trips with comprehensive dashboards.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="bg-[#212121] rounded-[40px] p-8 shadow-2xl animate-slide-in-right">
                <div className="bg-[#FDFDFF] rounded-[30px] p-6 space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-[#212121]">Agent Dashboard</h3>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#EDEDED] rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#212121] mb-1">127</div>
                      <div className="text-xs font-medium text-[#212121]/70">Active Groups</div>
                    </div>
                    <div className="bg-[#EDEDED] rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#212121] mb-1">94%</div>
                      <div className="text-xs font-medium text-[#212121]/70">Satisfaction</div>
                    </div>
                  </div>

                  <div className="h-32 flex items-end gap-2">
                    <div className="flex-1 bg-gradient-to-t from-[#212121] to-[#212121]/70 rounded-t-lg" style={{ height: '60%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#212121] to-[#212121]/70 rounded-t-lg" style={{ height: '75%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#212121] to-[#212121]/70 rounded-t-lg" style={{ height: '85%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#212121] to-[#212121]/70 rounded-t-lg" style={{ height: '95%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#212121] to-[#212121]/70 rounded-t-lg" style={{ height: '70%' }}></div>
                    <div className="flex-1 bg-gradient-to-t from-[#212121] to-[#212121]/70 rounded-t-lg" style={{ height: '80%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Showcase */}
        <section id="features" className="py-32 bg-[#FDFDFF]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-serif mb-6 text-[#212121] leading-tight">
                Powerful Features for <span className="italic text-[#212121]/70">Everyone</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Cards */}
              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
                <h3 className="text-xl font-bold mb-4 text-[#212121]">Guided Trip Planning</h3>
                <p className="text-[#212121]/70 mb-6">Step-by-step forms capture preferences, budget, and group composition for personalized recommendations.</p>
                <div className="bg-[#EDEDED] rounded-xl p-4">
                  <div className="text-sm text-[#212121]/70">Destination, dates, budget range, group details, individual preferences</div>
                </div>
              </div>

              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
                <h3 className="text-xl font-bold mb-4 text-[#212121]">Natural Language Changes</h3>
                <p className="text-[#212121]/70 mb-6">Request modifications like "add a beach day" or "skip museums" and see instant cost impacts.</p>
                <div className="bg-[#EDEDED] rounded-xl p-4 space-y-2">
                  <div className="text-sm text-[#212121]">"Add a beach day"</div>
                  <div className="text-xs text-[#212121]/70">+$120 • +4 hours</div>
                </div>
              </div>

              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
                <h3 className="text-xl font-bold mb-4 text-[#212121]">Comparison Views</h3>
                <p className="text-[#212121]/70 mb-6">Agents see old vs new itineraries with clear decision controls and margin analysis.</p>
                <div className="bg-[#EDEDED] rounded-xl p-4">
                  <div className="text-sm text-[#212121]/70">Approve • Tweak • Reject</div>
                </div>
              </div>

              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
                <h3 className="text-xl font-bold mb-4 text-[#212121]">Family-Level Granularity</h3>
                <p className="text-[#212121]/70 mb-6">Track individual families within group tours with unique preferences and constraints.</p>
                <div className="bg-[#EDEDED] rounded-xl p-4">
                  <div className="text-sm text-[#212121]/70">Adults • Children • Seniors • Dietary needs</div>
                </div>
              </div>

              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
                <h3 className="text-xl font-bold mb-4 text-[#212121]">Instant Messaging</h3>
                <p className="text-[#212121]/70 mb-6">Send updates, reminders, or emergency alerts to families with one click.</p>
                <div className="bg-[#EDEDED] rounded-xl p-4">
                  <div className="text-sm text-[#212121]/70">Bus departs 9:00 AM from lobby</div>
                </div>
              </div>

              <div className="bg-[#FDFDFF] rounded-3xl p-8 shadow-lg border border-[#EDEDED]">
                <h3 className="text-xl font-bold mb-4 text-[#212121]">Status Transitions</h3>
                <p className="text-[#212121]/70 mb-6">Clear workflow from draft to sent to approved to booked with full visibility.</p>
                <div className="bg-[#EDEDED] rounded-xl p-4">
                  <div className="text-sm text-[#212121]/70">Draft → Sent → Approved → Booked</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="py-32 bg-[#212121]">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="space-y-12">
              <h2 className="text-5xl md:text-6xl font-serif text-[#FDFDFF] leading-tight">
                Ready to Transform <span className="italic text-[#FDFDFF]/70">Travel Planning?</span>
              </h2>
              <p className="text-xl text-[#FDFDFF]/70 max-w-3xl mx-auto">
                Join thousands of travelers and agents creating exceptional travel experiences with AI-powered collaboration.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/customer-login" className="bg-[#FDFDFF] text-[#212121] px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:bg-[#EDEDED] transition-all">
                  Start as Customer
                </Link>
                <Link href="/agent-login" className="bg-[#EDEDED] text-[#212121] px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:bg-[#FDFDFF] transition-all">
                  Join as Agent
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 bg-[#FDFDFF] border-t border-[#EDEDED]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-[#212121]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-xl font-black tracking-tight text-[#212121]">Meili AI</span>
            </div>

            <nav className="flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-[#212121]/70">
              <a href="#features" className="hover:text-[#212121] transition-colors">Features</a>
              <a href="#customer-experience" className="hover:text-[#212121] transition-colors">Customer Experience</a>
              <a href="#agent-tools" className="hover:text-[#212121] transition-colors">Agent Tools</a>
              <a href="#pricing" className="hover:text-[#212121] transition-colors">Get Started</a>
            </nav>
          </div>

          <div className="pt-8 border-t border-[#EDEDED] flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-medium uppercase tracking-[0.2em] text-[#212121]/50">
            <p>© 2026 Meili AI. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[#212121] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#212121] transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}