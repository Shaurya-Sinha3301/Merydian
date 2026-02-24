'use client';

import Header from './landing/Header';
import HeroSection from './landing/HeroSection';
import FeaturesSection from './landing/FeaturesSection';
import AnalyticsSection from './landing/AnalyticsSection';
import AISupportSection from './landing/AISupportSection';
import TestimonialSection from './landing/TestimonialSection';
import PricingSection from './landing/PricingSection';
import Footer from './landing/Footer';

export default function LandingPage() {
  return (
    <>
      <style>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="bg-[#0c0c0c] text-white font-sans antialiased selection:bg-white selection:text-black">
        <Header />

        <main>
          <HeroSection />
          <FeaturesSection />
          <AnalyticsSection />
          <AISupportSection />
          <TestimonialSection />
          <PricingSection />
        </main>

        <Footer />
      </div>
    </>
  );
}
