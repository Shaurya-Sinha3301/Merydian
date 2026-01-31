import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-4xl w-full neu-flat rounded-3xl p-8 space-y-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-primary text-center font-heading drop-shadow-sm">
            Travel Agent Hub
          </h1>
          <p className="text-center text-foreground/80 text-lg max-w-2xl mx-auto">
            Select a portal to explore the integrated modules with our new <span className="font-semibold text-accent">Neumorphic Interface</span>.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Agent Portal */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2">
              <span className="w-2 h-8 bg-primary rounded-full"></span>
              Agent Portal
            </h2>
            <div className="grid gap-4">
              <Link href="/agent-dashboard" className="neu-button group p-6 rounded-2xl flex flex-col transition-all hover:-translate-y-1">
                <span className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">Agent Dashboard</span>
                <p className="text-sm text-foreground/60 mt-2">Manage trips, view stats, and handle tasks.</p>
              </Link>
              <Link href="/agent-itinerary-editor" className="neu-button group p-6 rounded-2xl flex flex-col transition-all hover:-translate-y-1">
                <span className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">Itinerary Editor</span>
                <p className="text-sm text-foreground/60 mt-2">Create and modify detailed trip plans.</p>
              </Link>
              <Link href="/agent-request-review" className="neu-button group p-6 rounded-2xl flex flex-col transition-all hover:-translate-y-1">
                <span className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">Request Review</span>
                <p className="text-sm text-foreground/60 mt-2">Review and approve customer trip requests.</p>
              </Link>
            </div>
          </div>

          {/* Customer Portal */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-secondary border-b-2 border-secondary/20 pb-2 flex items-center gap-2">
              <span className="w-2 h-8 bg-secondary rounded-full"></span>
              Customer Portal
            </h2>
            <div className="grid gap-4">
              <Link href="/customer-trip-request" className="neu-button group p-6 rounded-2xl flex flex-col transition-all hover:-translate-y-1">
                <span className="font-bold text-xl text-foreground group-hover:text-secondary transition-colors">Trip Request</span>
                <p className="text-sm text-foreground/60 mt-2">Submit new travel preferences and requests.</p>
              </Link>
              <Link href="/customer-itinerary-view" className="neu-button group p-6 rounded-2xl flex flex-col transition-all hover:-translate-y-1">
                <span className="font-bold text-xl text-foreground group-hover:text-secondary transition-colors">Itinerary View</span>
                <p className="text-sm text-foreground/60 mt-2">View approved itineraries as a client.</p>
              </Link>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

