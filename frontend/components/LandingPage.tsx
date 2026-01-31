'use client';

import { useEffect, useRef } from 'react';
import Header from './landing/Header';
import HeroSection from './landing/HeroSection';
import AISupportSection from './landing/AISupportSection';
import FeaturesSection from './landing/FeaturesSection';
import AnalyticsSection from './landing/AnalyticsSection';
import TestimonialSection from './landing/TestimonialSection';
import PricingSection from './landing/PricingSection';
import Footer from './landing/Footer';

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
    <div className="bg-neutral-50 text-neutral-900 font-sans antialiased selection:bg-teal-100">
      <Header />
      <main>
        <HeroSection parallaxRef={parallaxRef} />
        <AISupportSection />
        <FeaturesSection />
        <AnalyticsSection />
        <TestimonialSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}