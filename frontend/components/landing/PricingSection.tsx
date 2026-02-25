'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [0.95, 1]);

  return (
    <section ref={sectionRef} id="pricing" className="relative py-40 bg-white overflow-hidden">
      {/* Gold decorative line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
      
      <motion.div style={{ opacity, scale }} className="max-w-[1400px] mx-auto px-8">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="relative"
        >
          <div className="bg-black text-white p-20 md:p-32 text-center space-y-16 relative overflow-hidden shadow-2xl">
            {/* Gold corner decorations - positioned at exact corners */}
            <div className="absolute top-0 left-0 w-32 h-32">
              <div className="absolute top-0 left-0 w-full h-full border-t-[3px] border-l-[3px] border-[#D4AF37]" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32">
              <div className="absolute top-0 right-0 w-full h-full border-t-[3px] border-r-[3px] border-[#D4AF37]" />
            </div>
            <div className="absolute bottom-0 left-0 w-32 h-32">
              <div className="absolute bottom-0 left-0 w-full h-full border-b-[3px] border-l-[3px] border-[#D4AF37]" />
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32">
              <div className="absolute bottom-0 right-0 w-full h-full border-b-[3px] border-r-[3px] border-[#D4AF37]" />
            </div>
            
            {/* Gold accent lines */}
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "200px" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="absolute top-1/2 left-0 h-px bg-gradient-to-r from-[#D4AF37] to-transparent"
            />
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "200px" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="absolute top-1/2 right-0 h-px bg-gradient-to-l from-[#D4AF37] to-transparent"
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6 relative z-10"
            >
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: "100px" }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4 }}
                className="h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto"
              />
              
              <h4 className="text-xs uppercase tracking-[0.3em] text-white/60 font-light">
                Ready to transform your agency?
              </h4>
              
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1] tracking-tight">
                Start managing smarter, <span className="italic text-white/60">not harder.</span>
              </h2>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col lg:flex-row items-center justify-center gap-12 relative z-10"
            >
              <div className="text-left space-y-4 border-l-[3px] border-[#D4AF37] pl-12">
                <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-light">
                  Professional Plan
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-7xl font-serif text-white">$199</p>
                  <span className="text-lg text-white/40 uppercase tracking-wider font-light">/month</span>
                </div>
                <p className="text-sm text-white/60 font-light tracking-wide">
                  Up to 50 active groups
                </p>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-16 py-6 font-light uppercase tracking-[0.3em] text-sm transition-all shadow-2xl overflow-hidden"
              >
                <span className="relative z-10 text-black group-hover:text-white transition-colors duration-300">Request Demo</span>
                <div className="absolute inset-0 bg-white group-hover:bg-transparent transition-all duration-300" />
                <div className="absolute inset-0 bg-[#D4AF37] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="absolute inset-0 border-2 border-white" />
              </motion.button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="relative z-10"
            >
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: "100px" }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.8 }}
                className="h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mb-6"
              />
              
              <p className="text-white/50 text-sm font-light tracking-wide">
                14-day free trial • No credit card required • Cancel anytime
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}