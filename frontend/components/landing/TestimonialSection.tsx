export default function TestimonialSection() {
  return (
    <section className="py-32 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h3 className="text-4xl font-serif leading-tight text-neutral-900">
              Every number represents real travel agents saving time and growing revenue.
            </h3>
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-white p-10 rounded-[40px] space-y-6 group hover:from-neutral-900 hover:to-black transition-all duration-500 cursor-pointer">
              <div className="text-5xl font-bold">12 hours</div>
              <p className="text-sm font-medium opacity-90">Average time saved per week managing group itineraries</p>
              <svg className="w-8 h-8 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </div>
          </div>
          
          <div className="flex flex-col gap-8">
            <div className="bg-white p-10 rounded-[40px] space-y-6 border border-neutral-200">
              <svg className="w-12 h-12 text-neutral-400 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
              <p className="text-xl font-medium italic text-neutral-900">
                "TravelAgent Hub transformed how we handle group tours. The AI re-optimization saved us from a nightmare when a hotel chain went bankrupt mid-season."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600"></div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest">Sarah Martinez</p>
                  <p className="text-xs font-medium text-neutral-500">Owner, Wanderlust Travel Agency</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[40px] space-y-6 border border-neutral-200">
              <svg className="w-12 h-12 text-neutral-400 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
              </svg>
              <p className="text-xl font-medium italic text-neutral-900">
                "Managing 40+ families across 8 group tours used to require spreadsheet hell. Now it's all in one place with instant updates."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800"></div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest">James Chen</p>
                  <p className="text-xs font-medium text-neutral-500">Director, Global Tours Inc.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}