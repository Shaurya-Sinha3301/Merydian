'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useCanvasAnimation } from '@/hooks/useCanvasAnimation';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef1 = useRef<HTMLHeadingElement>(null);
  const textRef2 = useRef<HTMLDivElement>(null);
  const textRef3 = useRef<HTMLHeadingElement>(null);

  const { drawFrame, isLoading, progress } = useCanvasAnimation(canvasRef);

  useEffect(() => {
    if (isLoading) return;

    drawFrame(0);

    const handleResize = () => {
      const st = ScrollTrigger.getById('hero-scroll');
      if (st) {
        drawFrame(st.progress * 383);
      }
    };
    window.addEventListener('resize', handleResize);

    const tl = gsap.timeline({
      scrollTrigger: {
        id: 'hero-scroll',
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0,
        onUpdate: (self) => {
          const frameIndex = Math.floor(self.progress * 383);
          drawFrame(frameIndex);
        },
      },
    });

    // Scene 1: AI-POWERED TRAVEL (0% - 20%) — 1st sequence exterior chalet
    tl.fromTo(
      textRef1.current,
      { opacity: 0, scale: 0.9, y: 50 },
      { opacity: 1, scale: 1, y: 0, ease: 'power2.out', duration: 0.08 },
      0
    );
    tl.to(
      textRef1.current,
      { opacity: 0, scale: 1.1, y: -50, ease: 'power2.in', duration: 0.05 },
      0.15
    );

    // Scene 2: ELEVATED TRAVEL MANAGEMENT (25% - 48%) — 1st sequence zoom in
    tl.fromTo(
      textRef2.current,
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, ease: 'power2.out', duration: 0.08 },
      0.25
    );
    tl.to(
      textRef2.current,
      { opacity: 0, x: -50, ease: 'power2.in', duration: 0.05 },
      0.45
    );

    // Scene 3: WHERE LUXURY MEETS INTELLIGENCE (55% - 100%) — 2nd sequence nightscape
    tl.fromTo(
      textRef3.current,
      { opacity: 0, scale: 0.9, y: 50 },
      { opacity: 1, scale: 1, y: 0, ease: 'power2.out', duration: 0.1 },
      0.55
    );

    return () => {
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.getById('hero-scroll')?.kill();
      tl.kill();
    };
  }, [isLoading, drawFrame]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          <h1 className="font-serif text-3xl tracking-[0.3em] uppercase text-white">
            Merydian
          </h1>
          <div className="w-64 h-px bg-white/10 overflow-hidden mx-auto">
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-white to-transparent"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-light">
            Loading Experience
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="relative w-full h-full bg-black">
          <canvas
            ref={canvasRef}
            className="block w-full h-full object-cover filter contrast-[1.05] saturate-[1.05]"
          />

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />

          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Text 1: Centered - AI-POWERED TRAVEL */}
            <div className="absolute inset-0 flex items-center justify-center">
              <h1
                ref={textRef1}
                className="font-serif text-[clamp(4rem,10vw,8rem)] text-white text-center leading-[0.9] tracking-tight opacity-0 drop-shadow-2xl"
              >
                AI-POWERED
                <br />
                TRAVEL
              </h1>
            </div>

            {/* Text 2: Bottom Left - Value Proposition */}
            <div className="absolute inset-0 flex items-end justify-start pb-24 pl-10 md:pl-20">
              <div ref={textRef2} className="opacity-0 max-w-2xl">
                <motion.div
                  className="h-px w-16 bg-white/30 mb-8"
                />
                <h1 className="font-serif text-[clamp(3rem,7vw,6rem)] text-white leading-[1.1] tracking-tight drop-shadow-2xl mb-6">
                  Elevated Travel
                  <br />
                  <span className="italic text-white/70">Management</span>
                </h1>
                <p className="text-lg text-white/70 mb-8 font-light tracking-wide max-w-xl leading-relaxed">
                  Orchestrate exceptional journeys with precision and elegance
                </p>
                <Link href="/customer-login">
                  <button className="px-10 py-4 bg-white/5 backdrop-blur-md border border-white/20 text-white font-light tracking-[0.2em] uppercase text-xs hover:bg-white hover:text-black transition-all duration-500 pointer-events-auto group">
                    <span className="flex items-center gap-3">
                      Begin Your Journey
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </Link>
              </div>
            </div>

            {/* Text 3: Center - Final Message */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div ref={textRef3} className="opacity-0 text-center space-y-8 px-6">
                <h1 className="font-serif text-[clamp(3.5rem,9vw,8rem)] text-white leading-[1.1] tracking-tight drop-shadow-2xl">
                  Where Luxury
                  <br />
                  Meets <span className="italic text-white/70">Intelligence</span>
                </h1>
                <motion.div
                  className="h-px w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto"
                />
                <p className="text-sm uppercase tracking-[0.3em] text-white/50 font-light">
                  Scroll to Explore
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}