import { TripCard } from '../trips/TripCard';
import { useTrips } from '../../hooks/useTrips';
import { MetricCard } from '../../components/ui/MetricCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTripStore } from '../../stores/trip.store';
import { useAuthStore } from '../../stores/auth.store';
import { formatMoney } from '../../lib/format';

interface CustomerDashboardProps {
  onNavigate: (page: string) => void;
}

export function CustomerDashboard({ onNavigate }: CustomerDashboardProps) {
  const { data, isLoading, error } = useTrips(10, 0);
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);
  const userName = useAuthStore((s) => s.user?.full_name);

  const trips = data?.items ?? [];
  const totalCost = trips.reduce((sum, t) => sum + (t.total_cost ?? 0), 0);
  const feedbackRounds = trips.reduce((sum, t) => sum + (t.feedback_count ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          {userName ? `Welcome, ${userName}` : 'Welcome'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {trips.length === 1 ? 'You have 1 trip.' : `You have ${trips.length} trips.`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Trips" value={trips.length} trend="neutral" />
        <MetricCard label="Planned spend" value={formatMoney(totalCost)} trend="neutral" />
        <MetricCard label="Feedback rounds" value={feedbackRounds} trend="neutral" />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Your trips
        </h2>

        {isLoading && <p className="text-sm">Loading trips...</p>}
        {error && <p className="text-sm text-red-500">Failed to load trips.</p>}

        {!isLoading && trips.length === 0 && !error && (
          <EmptyState
            title="No trips yet"
            description="Trips appear here once your travel agent sets one up for your family."
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <TripCard
              key={trip.trip_id}
              trip={trip}
              onClick={() => {
                setCurrentTripId(trip.trip_id);
                onNavigate(`/trip-overview/${trip.trip_id}`);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
