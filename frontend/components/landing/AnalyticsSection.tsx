'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import { AreaChartInteractive } from '@/components/ui/area-chart-interactive';
import { PieChartInteractive } from '@/components/ui/pie-chart-interactive';
import { RadialChartStacked } from '@/components/ui/radial-chart-stacked';

export default function AnalyticsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const metricCountersRef = useRef<HTMLDivElement[]>([]);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

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
    <section ref={sectionRef} id="analytics" className="relative py-40 bg-black overflow-hidden">
      {/* Gold decorative line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
      
      <motion.div style={{ opacity }} className="max-w-[1400px] mx-auto px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="space-y-12"
          >
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "80px" }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-px bg-gradient-to-r from-[#D4AF37] to-transparent"
            />
            
            <h2 className="text-6xl md:text-7xl font-serif leading-[1.1] text-white tracking-tight">
              See your business <span className="italic text-white/60">in real-time.</span>
            </h2>
            
            <p className="text-xl text-white/60 leading-relaxed font-light tracking-wide">
              Track performance across months, years, and seasons. Monitor customer satisfaction ratings and reviews for every group.
            </p>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-8 pt-8">
              {[
                { target: 94, label: "Avg. Satisfaction", index: 0 },
                { target: 87, label: "On-Time Departures", index: 1 }
              ].map((metric, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="relative group"
                >
                  {/* Gold corner accent */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="space-y-3 p-6 border border-white/10 bg-white/5 backdrop-blur-sm group-hover:border-[#D4AF37]/50 transition-all duration-300">
                    <div 
                      ref={el => { if (el) metricCountersRef.current[metric.index] = el; }} 
                      className="text-5xl font-serif text-white group-hover:text-[#D4AF37] transition-colors duration-300" 
                      data-target={metric.target}
                    >
                      0
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/50 font-light">
                      {metric.label}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="space-y-3 p-6 border border-white/10 bg-white/5 backdrop-blur-sm group-hover:border-[#D4AF37]/50 transition-all duration-300">
                  <div className="text-5xl font-serif text-white group-hover:text-[#D4AF37] transition-colors duration-300">$2.4M</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50 font-light">Revenue (2025 YTD)</div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="space-y-3 p-6 border border-white/10 bg-white/5 backdrop-blur-sm group-hover:border-[#D4AF37]/50 transition-all duration-300">
                  <div className="text-5xl font-serif text-white group-hover:text-[#D4AF37] transition-colors duration-300">+32%</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50 font-light">Growth vs 2024</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Right Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <div className="bg-white p-12 border border-white/20 shadow-2xl relative overflow-hidden">
              {/* Gold corner accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#D4AF37]" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#D4AF37]" />
              
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif text-black tracking-tight">Performance Dashboard</h3>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span className="text-xs uppercase tracking-[0.2em] text-black/60 font-light">Live</span>
                  </motion.div>
                </div>
                
                <div className="py-4">
                  <AreaChartInteractive />
                </div>
                
                {/* Bottom Charts Grid */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-black/10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="space-y-4"
                  >
                    <h4 className="text-sm uppercase tracking-[0.2em] text-black/60 font-light text-center">
                      Monthly Distribution
                    </h4>
                    <PieChartInteractive />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="space-y-4"
                  >
                    <h4 className="text-sm uppercase tracking-[0.2em] text-black/60 font-light text-center">
                      Performance Score
                    </h4>
                    <RadialChartStacked />
                  </motion.div>
                </div>
                
                {/* Additional metrics */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-black/10">
                  {[
                    { value: "847", label: "Active Trips" },
                    { value: "98.2%", label: "Success Rate" },
                    { value: "4.8★", label: "Avg Rating" }
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                      className="text-center"
                    >
                      <div className="text-2xl font-serif text-black mb-1">{stat.value}</div>
                      <div className="text-xs uppercase tracking-[0.15em] text-black/50 font-light">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}