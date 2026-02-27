'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

export default function AISupportSection() {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const aiSteps = [
    {
      status: "Alert Detected",
      statusColor: "[#D4AF37]",
      content: "Hotel Miramar cancelled for Smith Family (4 guests)",
      delay: 0
    },
    {
      status: "AI Processing",
      statusColor: "[#D4AF37]/70",
      content: "Analyzing 847 alternatives...",
      hasProgress: true,
      delay: 0.2
    },
    {
      status: "Optimized Solution",
      statusColor: "[#D4AF37]",
      content: "Hotel Bellevue (4.8★) - $180/night",
      metrics: [
        { label: "Margin", value: "+$120" },
        { label: "Satisfaction", value: "98%" }
      ],
      delay: 0.4
    }
  ];

  return (
    <section ref={sectionRef} id="ai-support" className="relative py-40 bg-white overflow-hidden">
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
            
            <h2 className="text-6xl md:text-7xl font-serif leading-[1.1] text-black tracking-tight">
              When disruption strikes, <span className="italic text-black/60">AI re-optimizes instantly.</span>
            </h2>
            
            <p className="text-xl text-black/60 leading-relaxed font-light tracking-wide">
              Hotel cancellation? Flight delay? Our agentic AI analyzes alternatives in real-time, maximizing both profit margin and customer satisfaction.
            </p>
            
            <div className="space-y-8 pt-8">
              {[
                {
                  title: "Instant Alternative Sourcing",
                  description: "AI scans 1000+ options in under 3 seconds across hotels, transport, and activities."
                },
                {
                  title: "Profit + Satisfaction Optimization",
                  description: "Algorithm balances margin preservation with customer happiness scores."
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + idx * 0.1 }}
                  className="border-l-2 border-[#D4AF37] pl-8 space-y-2"
                >
                  <h3 className="text-xl font-serif text-black tracking-tight">{feature.title}</h3>
                  <p className="text-black/60 font-light leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Right AI Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="relative"
          >
            <div className="space-y-8">
              {aiSteps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: step.delay }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="relative group"
                >
                  <div className="bg-white p-8 border-2 border-black/10 shadow-xl relative overflow-hidden hover:border-[#D4AF37]/50 transition-all duration-300">
                    {/* Gold corner accents */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-3 h-3 rounded-full bg-${step.statusColor}`}
                        />
                        <span className="text-xs uppercase tracking-[0.2em] text-black/70 font-light">
                          {step.status}
                        </span>
                      </div>
                      
                      <p className="text-base font-serif text-black leading-relaxed">
                        {step.content}
                      </p>
                      
                      {step.hasProgress && (
                        <div className="h-1 bg-black/10 overflow-hidden">
                          <motion.div 
                            initial={{ width: "0%" }}
                            whileInView={{ width: "100%" }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, delay: step.delay + 0.3 }}
                            className="h-full bg-gradient-to-r from-[#D4AF37] to-black"
                          />
                        </div>
                      )}
                      
                      {step.metrics && (
                        <div className="flex gap-6 pt-4 border-t border-black/10">
                          {step.metrics.map((metric, metricIdx) => (
                            <motion.div
                              key={metricIdx}
                              initial={{ opacity: 0, scale: 0.9 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.5, delay: step.delay + 0.5 + metricIdx * 0.1 }}
                              className="space-y-1"
                            >
                              <span className="text-xs text-black/50 font-light">{metric.label}:</span>
                              <span className="text-lg font-serif text-[#D4AF37] ml-2">{metric.value}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}