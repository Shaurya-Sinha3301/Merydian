'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative w-full bg-[#0c0c0c] text-white pt-32 pb-10 px-6 md:px-12 border-t border-white/10">
      <div className="max-w-[1920px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-40">
          {/* SERVICES */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h4 className="font-sans font-bold text-[10px] tracking-[0.2em] text-white/40 mb-8 uppercase">Services</h4>
            <ul className="space-y-4 font-sans text-sm text-white/80">
              <li><a href="#features" className="hover:text-white cursor-pointer transition-colors">Features</a></li>
              <li><a href="#analytics" className="hover:text-white cursor-pointer transition-colors">Analytics</a></li>
              <li><a href="#ai-support" className="hover:text-white cursor-pointer transition-colors">AI Support</a></li>
              <li><a href="#pricing" className="hover:text-white cursor-pointer transition-colors">Pricing</a></li>
            </ul>
          </motion.div>

          {/* GET IN TOUCH */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h4 className="font-sans font-bold text-[10px] tracking-[0.2em] text-white/40 mb-8 uppercase">Get in Touch</h4>
            <ul className="space-y-4 font-sans text-sm text-white/80">
              <li className="hover:text-white cursor-pointer transition-colors">Contact</li>
              <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Press</li>
            </ul>
          </motion.div>

          {/* CONNECT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h4 className="font-sans font-bold text-[10px] tracking-[0.2em] text-white/40 mb-8 uppercase">Connect</h4>
            <ul className="space-y-4 font-sans text-sm text-white/80">
              <li className="hover:text-white cursor-pointer transition-colors">Instagram</li>
              <li className="hover:text-white cursor-pointer transition-colors">LinkedIn</li>
              <li className="hover:text-white cursor-pointer transition-colors">Twitter</li>
            </ul>
          </motion.div>

          {/* LOGIN */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h4 className="font-sans font-bold text-[10px] tracking-[0.2em] text-white/40 mb-8 uppercase">Access</h4>
            <div className="space-y-4">
              <Link href="/customer-login" className="block text-sm text-white/80 hover:text-white transition-colors">
                Customer Login
              </Link>
              <Link href="/agent-login" className="block text-sm text-white/80 hover:text-white transition-colors">
                Agent Login
              </Link>
            </div>
          </motion.div>
        </div>

        {/* BIG FOOTER TEXT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full overflow-hidden border-t border-white/10 pt-10"
        >
          <h1 className="font-serif text-[clamp(4rem,18vw,20rem)] leading-none text-center tracking-tighter text-white opacity-90 select-none">
            MERYDIAN
          </h1>
        </motion.div>

        {/* BOTTOM UTILS */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-10 text-[10px] text-white/40 font-sans uppercase tracking-widest">
          <p>© 2026 Merydian</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
            <span className="cursor-pointer hover:text-white transition-colors">Terms</span>
            <span className="cursor-pointer hover:text-white transition-colors">Sitemap</span>
          </div>
        </div>
      </div>
    </footer>
  );
}