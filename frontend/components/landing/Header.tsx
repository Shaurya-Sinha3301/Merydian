export default function Header() {
  return (
    <header className="fixed top-8 w-full z-50 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <svg className="w-8 h-8 text-neutral-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="text-xl font-black tracking-tight">TravelAgent Hub</span>
        </a>
        
        <nav className="hidden md:flex items-center pill-nav gap-8 text-xs font-black uppercase tracking-widest text-neutral-700">
          <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
          <a href="#analytics" className="hover:text-neutral-900 transition-colors">Analytics</a>
          <a href="#ai-support" className="hover:text-neutral-900 transition-colors">AI Support</a>
          <a href="#pricing" className="hover:text-neutral-900 transition-colors">Pricing</a>
        </nav>
        
        <button className="bg-neutral-900 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
          Request Demo
        </button>
      </div>
    </header>
  );
}