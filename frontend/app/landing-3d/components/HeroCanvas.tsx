'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useCanvasVideo } from '../hooks/useCanvasVideo';

gsap.registerPlugin(ScrollTrigger);

interface HeroCanvasProps {
  scrollTrackRef: React.RefObject<HTMLDivElement | null>;
}

export default function HeroCanvas({ scrollTrackRef }: HeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null) as React.RefObject<HTMLCanvasElement>;
  const textRef1 = useRef<HTMLHeadingElement>(null);
  const textRef2 = useRef<HTMLHeadingElement>(null);
  const textRef3 = useRef<HTMLHeadingElement>(null);

  const { drawFrame, isLoading, progress } = useCanvasVideo(canvasRef);

  useEffect(() => {
    if (isLoading) return;

    drawFrame(0);

    const handleResize = () => {
      const st = ScrollTrigger.getById('hero-scroll');
      if (st) {
        drawFrame(st.progress * 277);
      }
    };
    window.addEventListener('resize', handleResize);

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'hero-scroll',
        trigger: scrollTrackRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0,
        onUpdate: (self) => {
          const frameIndex = Math.floor(self.progress * 277);
          drawFrame(frameIndex);
        },
      },
    });

    // Scene 1: AI-POWERED TRAVEL (0% - 25%)
    tl.fromTo(
      textRef1.current,
      { opacity: 0, scale: 0.9, y: 50 },
      { opacity: 1, scale: 1, y: 0, ease: 'power2.out', duration: 0.1 },
      0
    );
    tl.to(
      textRef1.current,
      { opacity: 0, scale: 1.1, y: -50, ease: 'power2.in', duration: 0.05 },
      0.2
    );

    // Scene 2: INTELLIGENT PLANNING (30% - 60%)
    tl.fromTo(
      textRef2.current,
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, ease: 'power2.out', duration: 0.1 },
      0.3
    );
    tl.to(
      textRef2.current,
      { opacity: 0, x: -50, ease: 'power2.in', duration: 0.05 },
      0.55
    );

    // Scene 3: YOUR JOURNEY AWAITS (65% - 100%)
    tl.fromTo(
      textRef3.current,
      { opacity: 0, scale: 0.9, y: 50 },
      { opacity: 1, scale: 1, y: 0, ease: 'power2.out', duration: 0.1 },
      0.65
    );

    return () => {
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.getById('hero-scroll')?.kill();
      tl.kill();
    };
  }, [isLoading, drawFrame, scrollTrackRef]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
        <h1 className="font-serif text-2xl tracking-widest mb-4">LOADING EXPERIENCE</h1>
        <div className="w-64 h-0.5 bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full object-cover filter contrast-[1.05] saturate-[1.05]"
      />

      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Text 1: Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            ref={textRef1}
            className="font-serif text-[clamp(4rem,10vw,8rem)] text-white text-center leading-[0.9] tracking-tighter opacity-0 drop-shadow-2xl"
          >
            AI-POWERED
            <br />
            TRAVEL
          </h1>
        </div>

        {/* Text 2: Bottom Left */}
        <div className="absolute inset-0 flex items-end justify-start pb-32 pl-10 md:pl-20">
          <div>
            <h1
              ref={textRef2}
              className="font-serif text-[clamp(3rem,6vw,5rem)] text-white leading-none opacity-0 drop-shadow-2xl text-left"
            >
              Intelligent
              <br />
              Planning
              <br />
              Made Simple
            </h1>
            <Link href="/customer-login">
              <button className="mt-6 px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-sans tracking-widest uppercase text-xs hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 hover:shadow-brand-gold/20 pointer-events-auto">
                Get Started
              </button>
            </Link>
          </div>
        </div>

        {/* Text 3: Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            ref={textRef3}
            className="font-serif text-[clamp(3rem,8vw,7rem)] text-white text-center leading-none opacity-0 drop-shadow-2xl"
          >
            YOUR JOURNEY
            <br />
            AWAITS
          </h1>
        </div>
      </div>
    </div>
  );
}
