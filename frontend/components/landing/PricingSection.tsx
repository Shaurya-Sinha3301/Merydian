'use client';

import { motion } from 'motion/react';

export default function PricingSection() {
  return (
    <section id="pricing" className="py-32 bg-[#0c0c0c]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-[80px] p-16 md:p-32 text-center space-y-12 relative overflow-hidden border border-white/10"
        >
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-amber-400/10 blur-[150px] rounded-full"></div>
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-amber-400/10 blur-[150px] rounded-full"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4 relative z-10"
          >
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-amber-400/80">Ready to transform your agency?</h4>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1]">
              Start managing smarter, <span className="italic text-neutral-400">not harder.</span>
            </h2>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 relative z-10"
          >
            <div className="text-left space-y-2 border-l-4 border-amber-400 pl-8">
              <p className="text-sm font-black uppercase tracking-widest text-amber-400/80">Professional Plan</p>
              <p className="text-6xl font-bold">$199 <span className="text-lg opacity-40 uppercase tracking-normal">/month</span></p>
              <p className="text-sm text-neutral-400">Up to 50 active groups</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-neutral-900 px-12 py-6 rounded-full font-black uppercase tracking-[0.15em] text-sm hover:bg-amber-400 hover:text-black transition-all shadow-2xl"
            >
              Request Demo
            </motion.button>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-neutral-400 text-sm relative z-10"
          >
            14-day free trial • No credit card required • Cancel anytime
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}