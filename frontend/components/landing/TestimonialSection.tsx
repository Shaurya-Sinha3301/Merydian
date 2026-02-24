'use client';

import { motion } from 'motion/react';

export default function TestimonialSection() {
  return (
    <section className="relative py-40 bg-white overflow-hidden">
      {/* Gold decorative line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
      
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="grid lg:grid-cols-2 gap-20">
          {/* Left Side - Stat Card */}
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
            
            <h3 className="text-5xl md:text-6xl font-serif leading-[1.1] text-black tracking-tight">
              Every number represents real travel agents <span className="italic text-black/60">saving time and growing revenue.</span>
            </h3>
            
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="relative bg-black text-white p-12 space-y-6 group cursor-pointer overflow-hidden"
            >
              {/* Gold corner accents - positioned to align with edges */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#D4AF37]" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#D4AF37]" />
              
              <div className="relative z-10">
                <div className="text-7xl font-serif text-white mb-4">12 hours</div>
                <p className="text-sm font-light tracking-wide text-white/80 uppercase">
                  Average time saved per week managing group itineraries
                </p>
                <motion.svg 
                  whileHover={{ x: 10, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-8 h-8 mt-6 text-[#D4AF37]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </motion.svg>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Right Side - Testimonials */}
          <div className="flex flex-col gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5 }}
              className="relative bg-white p-10 space-y-6 border-2 border-black/10 group hover:border-[#D4AF37]/50 transition-all duration-300"
            >
              {/* Gold corner accents on hover */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <svg className="w-12 h-12 text-[#D4AF37] opacity-30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
              <p className="text-xl font-light italic text-black leading-relaxed">
                "TravelAgent Hub transformed how we handle group tours. The AI re-optimization saved us from a nightmare when a hotel chain went bankrupt mid-season."
              </p>
              <div className="flex items-center gap-4 pt-4 border-t border-black/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B49337]"></div>
                <div>
                  <p className="text-sm font-serif text-black tracking-tight">Sarah Martinez</p>
                  <p className="text-xs font-light text-black/60 uppercase tracking-wider">Owner, Wanderlust Travel Agency</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -5 }}
              className="relative bg-white p-10 space-y-6 border-2 border-black/10 group hover:border-[#D4AF37]/50 transition-all duration-300"
            >
              {/* Gold corner accents on hover */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <svg className="w-12 h-12 text-[#D4AF37] opacity-30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
              <p className="text-xl font-light italic text-black leading-relaxed">
                "Managing 40+ families across 8 group tours used to require spreadsheet hell. Now it's all in one place with instant updates."
              </p>
              <div className="flex items-center gap-4 pt-4 border-t border-black/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#B49337] to-[#947737]"></div>
                <div>
                  <p className="text-sm font-serif text-black tracking-tight">James Chen</p>
                  <p className="text-xs font-light text-black/60 uppercase tracking-wider">Director, Global Tours Inc.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}