import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 text-center font-heading">
          Travel Agent Hub
        </h1>
        <p className="text-center text-gray-600">
          Select a portal to explore the integrated modules.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Agent Portal */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-primary border-b pb-2">Agent Portal</h2>
            <div className="grid gap-3">
              <Link href="/agent-dashboard" className="p-4 rounded-xl border hover:border-primary hover:shadow-md transition-all group">
                <span className="font-medium text-lg group-hover:text-primary">Agent Dashboard</span>
                <p className="text-sm text-gray-500">Manage trips, view stats, and handle tasks.</p>
              </Link>
              <Link href="/agent-itinerary-editor" className="p-4 rounded-xl border hover:border-primary hover:shadow-md transition-all group">
                <span className="font-medium text-lg group-hover:text-primary">Itinerary Editor</span>
                <p className="text-sm text-gray-500">Create and modify detailed trip plans.</p>
              </Link>
              <Link href="/agent-request-review" className="p-4 rounded-xl border hover:border-primary hover:shadow-md transition-all group">
                <span className="font-medium text-lg group-hover:text-primary">Request Review</span>
                <p className="text-sm text-gray-500">Review and approve customer trip requests.</p>
              </Link>
            </div>
          </div>

          {/* Customer Portal */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-secondary border-b pb-2">Customer Portal</h2>
            <div className="grid gap-3">
              <Link href="/customer-trip-request" className="p-4 rounded-xl border hover:border-secondary hover:shadow-md transition-all group">
                <span className="font-medium text-lg group-hover:text-secondary">Trip Request</span>
                <p className="text-sm text-gray-500">Submit new travel preferences and requests.</p>
              </Link>
              <Link href="/customer-itinerary-view" className="p-4 rounded-xl border hover:border-secondary hover:shadow-md transition-all group">
                <span className="font-medium text-lg group-hover:text-secondary">Itinerary View</span>
                <p className="text-sm text-gray-500">View approved itineraries as a client.</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t text-center">
          <Link href="/operations" className="text-sm text-blue-500 hover:underline">
            Go to Operations Dashboard (Legacy)
          </Link>
        </div>
      </div>
    </div>
  );
}
