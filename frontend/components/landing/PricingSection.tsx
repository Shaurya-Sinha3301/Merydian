export default function PricingSection() {
  return (
    <section id="pricing" className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-neutral-900 text-white rounded-[80px] p-16 md:p-32 text-center space-y-12 relative overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-white/5 blur-[150px] rounded-full"></div>
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-white/5 blur-[150px] rounded-full"></div>
          
          <div className="space-y-4 relative z-10">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Ready to transform your agency?</h4>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1]">
              Start managing smarter, <span className="italic text-neutral-400">not harder.</span>
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 relative z-10">
            <div className="text-left space-y-2 border-l-4 border-white pl-8">
              <p className="text-sm font-black uppercase tracking-widest text-neutral-400">Professional Plan</p>
              <p className="text-6xl font-bold">$199 <span className="text-lg opacity-40 uppercase tracking-normal">/month</span></p>
              <p className="text-sm text-neutral-400">Up to 50 active groups</p>
            </div>
            <button className="bg-white text-neutral-900 px-12 py-6 rounded-full font-black uppercase tracking-[0.15em] text-sm hover:bg-neutral-200 hover:text-neutral-900 transition-all shadow-2xl">
              Request Demo
            </button>
          </div>
          
          <p className="text-neutral-400 text-sm relative z-10">14-day free trial • No credit card required • Cancel anytime</p>
        </div>
      </div>
    </section>
  );
}