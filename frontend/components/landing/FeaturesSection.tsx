'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [0.95, 1]);

  const features = [
    {
      number: "01",
      title: "Multi-Group Management",
      description: "Orchestrate multiple families and groups simultaneously with precision and elegance.",
      stats: [
        { value: "127", label: "Active Groups" },
        { value: "842", label: "Families Managed" }
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      )
    },
    {
      number: "02",
      title: "AI Re-optimization",
      description: "Intelligent algorithms that maximize satisfaction while maintaining profitability.",
      stats: [
        { value: "94%", label: "Satisfaction Rate" },
        { value: "2.3x", label: "Efficiency Gain" }
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      )
    },
    {
      number: "03",
      title: "Real-time Analytics",
      description: "Comprehensive insights into performance, revenue, and customer satisfaction metrics.",
      stats: [
        { value: "$2.4M", label: "Revenue Tracked" },
        { value: "99.8%", label: "Uptime" }
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      )
    },
    {
      number: "04",
      title: "Instant Communication",
      description: "Seamless messaging system for updates, alerts, and real-time coordination.",
      stats: [
        { value: "<1s", label: "Delivery Time" },
        { value: "100%", label: "Reach Rate" }
      ],
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
      )
    }
  ];

  return (
    <section 
      ref={sectionRef}
      id="features" 
      className="relative py-40 bg-white overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
      
      <motion.div 
        style={{ opacity, scale }}
        className="max-w-[1400px] mx-auto px-8"
      >
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="text-center mb-24"
        >
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mb-8"
          />
          <h2 className="text-6xl md:text-7xl font-serif text-black mb-6 tracking-tight">
            Elevated <span className="italic text-[#D4AF37]">Excellence</span>
          </h2>
          <p className="text-xl text-black/60 max-w-2xl mx-auto font-light tracking-wide">
            Precision-engineered features for the discerning travel professional
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.15,
                ease: [0.25, 0.1, 0.25, 1.0]
              }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative bg-white border border-black/10 rounded-none p-12 h-full overflow-hidden transition-all duration-500 hover:border-[#D4AF37]/50 hover:shadow-2xl hover:shadow-[#D4AF37]/10">
                {/* Gold accent line */}
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "60px" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.15 + 0.3 }}
                  className="absolute top-0 left-0 h-1 bg-[#D4AF37]"
                />
                
                {/* Number */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 + 0.2 }}
                  className="absolute top-8 right-8 text-8xl font-serif text-black/5 group-hover:text-[#D4AF37]/10 transition-colors duration-500"
                >
                  {feature.number}
                </motion.div>

                {/* Icon */}
                <motion.div 
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="text-black mb-8 group-hover:text-[#D4AF37] transition-colors duration-500"
                >
                  {feature.icon}
                </motion.div>

                {/* Content */}
                <h3 className="text-3xl font-serif text-black mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-black/60 mb-8 leading-relaxed font-light">
                  {feature.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-6 pt-8 border-t border-black/10">
                  {feature.stats.map((stat, statIndex) => (
                    <motion.div 
                      key={statIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ 
                        duration: 0.5, 
                        delay: index * 0.15 + 0.4 + statIndex * 0.1 
                      }}
                      whileHover={{ scale: 1.05 }}
                      className="text-center"
                    >
                      <div className="text-4xl font-serif text-black mb-2 group-hover:text-[#D4AF37] transition-colors duration-500">
                        {stat.value}
                      </div>
                      <div className="text-xs uppercase tracking-[0.2em] text-black/50 font-light">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/0 group-hover:from-[#D4AF37]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-24"
        >
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.8 }}
            className="h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mb-8"
          />
          <p className="text-black/60 text-lg font-light tracking-wide">
            Experience the pinnacle of travel management
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}