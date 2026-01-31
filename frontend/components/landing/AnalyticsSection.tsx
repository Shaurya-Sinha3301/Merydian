'use client';

import { useEffect, useRef } from 'react';
import { MiniChart } from '@/components/ui/mini-chart';

export default function AnalyticsSection() {
  const metricCountersRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    // Metric Counter Animation
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute('data-target') || '0');
          let current = 0;
          const increment = target / 60;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              entry.target.textContent = target + '%';
              clearInterval(timer);
            } else {
              entry.target.textContent = Math.floor(current) + '%';
            }
          }, 30);
        }
      });
    }, { threshold: 0.5 });

    metricCountersRef.current.forEach(counter => {
      if (counter) {
        counterObserver.observe(counter);
      }
    });

    return () => {
      counterObserver.disconnect();
    };
  }, []);

  return (
    <section id="analytics" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12 text-sm font-medium tracking-wide">
          <span className="w-9 h-9 rounded-full border-2 border-neutral-900 flex items-center justify-center text-sm font-bold">3</span>
          <div className="w-12 h-[2px] bg-neutral-900"></div>
          <span className="uppercase tracking-[0.15em] text-xs font-black">Analytics & Insights</span>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1] text-neutral-900">
              See your business <span className="italic text-neutral-600">in real-time.</span>
            </h2>
            <p className="text-xl text-neutral-600 leading-relaxed max-w-xl">
              Track performance across months, years, and seasons. Monitor customer satisfaction ratings and reviews for every group.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div ref={el => { if (el) metricCountersRef.current[0] = el; }} className="text-5xl font-bold text-neutral-900" data-target="94">0</div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-500">Avg. Satisfaction</div>
              </div>
              <div className="space-y-2">
                <div ref={el => { if (el) metricCountersRef.current[1] = el; }} className="text-5xl font-bold text-neutral-900" data-target="87">0</div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-500">On-Time Departures %</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-bold text-neutral-900">$2.4M</div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-500">Revenue (2025 YTD)</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-bold text-neutral-900">+32%</div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-500">Growth vs 2024</div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview with MiniChart */}
          <div className="bg-neutral-900 rounded-[60px] p-8 shadow-2xl">
            <div className="bg-neutral-800 rounded-[40px] p-8 space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white">Performance Dashboard</h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-neutral-600"></div>
                  <div className="w-3 h-3 rounded-full bg-neutral-500"></div>
                  <div className="w-3 h-3 rounded-full bg-neutral-400"></div>
                </div>
              </div>
              
              {/* Enhanced Chart with MiniChart Component */}
              <div className="flex justify-center">
                <TravelAnalyticsChart />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Custom Travel Analytics Chart Component
function TravelAnalyticsChart() {
  return (
    <div className="w-full max-w-md">
      <MiniChart />
    </div>
  );
}