'use client';

import { useEffect, useRef } from 'react';

export default function FeaturesSection() {
  const featureCardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.remove('opacity-0', 'translate-y-8');
            entry.target.classList.add('opacity-100', 'translate-y-0');
          }, index * 150);
        }
      });
    }, { threshold: 0.1 });

    featureCardsRef.current.forEach(card => {
      if (card) {
        card.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-800', 'ease-out');
        cardObserver.observe(card);
      }
    });

    return () => {
      cardObserver.disconnect();
    };
  }, []);

  return (
    <section id="features" className="py-32 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12 text-sm font-medium tracking-wide">
          <span className="w-9 h-9 rounded-full border-2 border-neutral-900 flex items-center justify-center text-sm font-bold">2</span>
          <div className="w-12 h-[2px] bg-neutral-900"></div>
          <span className="uppercase tracking-[0.15em] text-xs font-black">Multi-Group Management</span>
        </div>
        
        <h2 className="text-5xl md:text-6xl font-serif mb-20 text-neutral-900 leading-[1.1] max-w-3xl">
          One dashboard. <span className="italic text-coral-600">Infinite groups.</span> Zero chaos.
        </h2>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Large Feature Card */}
          <div ref={el => { if (el) featureCardsRef.current[0] = el; }} className="lg:col-span-2 bg-white rounded-[40px] p-12 shadow-sm border border-neutral-100">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <h3 className="text-2xl font-serif font-semibold">Family-Level Granularity</h3>
            </div>
            <p className="text-lg text-neutral-600 mb-8 max-w-xl leading-relaxed">
              Track individual families within group tours. Each family has unique preferences, dietary requirements, and booking status.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl p-6 border border-neutral-300">
                <div className="text-4xl font-bold text-neutral-900 mb-2">127</div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-700">Active Groups</div>
              </div>
              <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl p-6 border border-neutral-700">
                <div className="text-4xl font-bold text-white mb-2">842</div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-300">Families Managed</div>
              </div>
            </div>
          </div>

          {/* Tall Feature Card */}
          <div ref={el => { if (el) featureCardsRef.current[1] = el; }} className="lg:row-span-2 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-[40px] p-12 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
              <h3 className="text-2xl font-serif font-semibold">Instant Messaging</h3>
            </div>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Notify families instantly. Send updates, reminders, or emergency alerts with one click.
            </p>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-none p-4 border border-white/20">
                <p className="text-sm">Your bus departs at 9:00 AM tomorrow from Hotel Lobby</p>
              </div>
              <div className="bg-teal-600 rounded-2xl rounded-br-none p-4 ml-8">
                <p className="text-sm">Got it, thanks! 👍</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-none p-4 border border-white/20">
                <p className="text-sm">Weather update: Sunny, 75°F. Perfect for boat tour!</p>
              </div>
            </div>
          </div>

          {/* Wide Feature Card */}
          <div ref={el => { if (el) featureCardsRef.current[2] = el; }} className="lg:col-span-2 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-[40px] p-12 shadow-sm border border-neutral-200">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              <h3 className="text-2xl font-serif font-semibold text-neutral-900">Unified Itinerary View</h3>
            </div>
            <p className="text-lg text-neutral-700 mb-6 max-w-2xl leading-relaxed">
              See all group itineraries in one timeline. Drag to reschedule. Click to edit. Simple.
            </p>
            <div className="flex items-center gap-3 overflow-x-auto pb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-300 min-w-[200px]">
                <div className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">Day 1</div>
                <div className="text-sm font-semibold text-neutral-900">Airport → Hotel</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-300 min-w-[200px]">
                <div className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">Day 2</div>
                <div className="text-sm font-semibold text-neutral-900">City Tour + Museum</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-300 min-w-[200px]">
                <div className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">Day 3</div>
                <div className="text-sm font-semibold text-neutral-900">Beach Excursion</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-300 min-w-[200px]">
                <div className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">Day 4</div>
                <div className="text-sm font-semibold text-neutral-900">Mountain Hiking</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}