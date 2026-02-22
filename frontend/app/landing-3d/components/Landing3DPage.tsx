'use client';

import { useRef } from 'react';
import HeroCanvas from './HeroCanvas';
import FeaturesSection from './FeaturesSection';
import BentoGrid from './BentoGrid';

export default function Landing3DPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <main className="w-full bg-[#0c0c0c]">
      {/* Scroll track: 300vh height total */}
      <div ref={containerRef} className="relative h-[300vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <HeroCanvas scrollTrackRef={containerRef} />
        </div>
      </div>

      {/* Content sections */}
      <div className="relative z-10 bg-[#0c0c0c]">
        <FeaturesSection />
        <BentoGrid />
      </div>
    </main>
  );
}
