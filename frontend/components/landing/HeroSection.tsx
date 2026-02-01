import { RefObject } from 'react';

interface HeroSectionProps {
  parallaxRef: RefObject<HTMLDivElement | null>;
}

export default function HeroSection({ parallaxRef }: HeroSectionProps) {
  return (
    <section className="relative h-screen min-h-[800px] flex items-center justify-center overflow-hidden">
      <div ref={parallaxRef} className="absolute inset-0 z-0 will-change-transform">
        <img 
          src="https://images.unsplash.com/photo-1727435770363-91dc029496da" 
          className="w-full h-full object-cover" 
          alt="Scenic coastal travel destination with turquoise waters and white buildings overlooking the Mediterranean sea at sunset"
        />
        {/* Enhanced gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 text-center">
        <div className="space-y-8 flex flex-col items-center">
          <h1 className="hero-title uppercase font-serif italic text-[64px] font-semibold text-white drop-shadow-2xl">
            Manage Every Journey
          </h1>
          <p className="text-2xl md:text-3xl text-white/90 max-w-3xl leading-relaxed font-medium drop-shadow-lg">
            AI-powered platform for travel agents managing multiple groups, families, and itineraries with zero stress.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button className="bg-white text-neutral-900 px-8 py-4 rounded-full flex items-center gap-3 group hover:bg-teal-50 hover:scale-105 transition-all text-sm font-black uppercase tracking-widest shadow-xl">
              <span>Request Demo</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
            <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:bg-white/30 hover:scale-105 transition-all shadow-xl">
              Watch Video
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}