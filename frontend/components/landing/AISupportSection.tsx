'use client';

import { useEffect, useRef } from 'react';

export default function AISupportSection() {
  const aiStepsRef = useRef<HTMLDivElement[]>([]);
  const routePathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const aiObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.remove('opacity-0', 'translate-y-5');
            entry.target.classList.add('opacity-100', 'translate-y-0');
          }, index * 400);
        }
      });
    }, { threshold: 0.2 });

    aiStepsRef.current.forEach(step => {
      if (step) {
        step.classList.add('opacity-0', 'translate-y-5', 'transition-all', 'duration-600', 'ease-out');
        aiObserver.observe(step);
      }
    });

    // SVG Path Animation
    if (routePathRef.current) {
      const pathObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && routePathRef.current) {
            routePathRef.current.style.strokeDashoffset = '0';
            routePathRef.current.style.transition = 'stroke-dashoffset 3s ease-in-out';
          }
        });
      }, { threshold: 0.3 });
      pathObserver.observe(routePathRef.current.parentElement!);
    }

    return () => {
      aiObserver.disconnect();
    };
  }, []);

  return (
    <section id="ai-support" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12 text-sm font-medium tracking-wide">
          <span className="w-9 h-9 rounded-full border-2 border-neutral-900 flex items-center justify-center text-sm font-bold">1</span>
          <div className="w-12 h-[2px] bg-neutral-900"></div>
          <span className="uppercase tracking-[0.15em] text-xs font-black">AI Support</span>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1] text-neutral-900">
              When disruption strikes, <span className="italic text-teal-600">AI re-optimizes instantly.</span>
            </h2>
            <p className="text-xl text-neutral-600 leading-relaxed max-w-xl">
              Hotel cancellation? Flight delay? Our agentic AI analyzes alternatives in real-time, maximizing both profit margin and customer satisfaction.
            </p>
            <div className="space-y-6">
              <div className="border-l-4 border-neutral-900 pl-6">
                <h3 className="text-lg font-bold mb-2">Instant Alternative Sourcing</h3>
                <p className="text-neutral-600">AI scans 1000+ options in under 3 seconds across hotels, transport, and activities.</p>
              </div>
              <div className="border-l-4 border-neutral-900 pl-6">
                <h3 className="text-lg font-bold mb-2">Profit + Satisfaction Optimization</h3>
                <p className="text-neutral-600">Algorithm balances margin preservation with customer happiness scores.</p>
              </div>
            </div>
          </div>
          
          {/* AI Visualization */}
          <div className="relative h-[600px] bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-[60px] p-12 overflow-hidden border border-neutral-200">
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 400 600">
                <path 
                  ref={routePathRef}
                  d="M 50 50 Q 200 150 150 300 T 350 550" 
                  stroke="#000000" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeDasharray="1000" 
                  strokeDashoffset="1000"
                />
              </svg>
            </div>
            <div className="relative z-10 space-y-8">
              <div ref={el => { if (el) aiStepsRef.current[0] = el; }}>
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-neutral-800 animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-800">Alert Detected</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900">Hotel Miramar cancelled for Smith Family (4 guests)</p>
                </div>
              </div>
              <div ref={el => { if (el) aiStepsRef.current[1] = el; }}>
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-neutral-600 animate-pulse"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-600">AI Processing</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 mb-3">Analyzing 847 alternatives...</p>
                  <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-neutral-800 to-neutral-600 animate-progress"></div>
                  </div>
                </div>
              </div>
              <div ref={el => { if (el) aiStepsRef.current[2] = el; }}>
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-neutral-900"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-900">Optimized Solution</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 mb-3">Hotel Bellevue (4.8★) - $180/night</p>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-neutral-500">Margin:</span>
                      <span className="font-bold text-neutral-900"> +$120</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Satisfaction:</span>
                      <span className="font-bold text-neutral-900"> 98%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}