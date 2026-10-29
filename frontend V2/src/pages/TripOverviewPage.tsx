import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { TripCard } from '../features/trips/TripCard';
import { useTripSummary } from '../hooks/useTrips';
import { useTripStore } from '../stores/trip.store';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { ROUTES } from '../constants/routes';
import { timeAgo } from '../lib/format';

export function TripOverviewPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading, error } = useTripSummary(tripId || '');
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);

  useEffect(() => {
    if (tripId) setCurrentTripId(tripId);
  }, [tripId, setCurrentTripId]);

  if (!tripId) return <div className="p-8 text-red-500">Trip ID is missing.</div>;
  if (isLoading) return <div className="p-8">Loading trip details...</div>;
  if (error || !trip) return <div className="p-8 text-red-500">Failed to load trip details.</div>;

  const history = trip.feedback_history ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Breadcrumbs
        crumbs={[
          { label: 'Dashboard', onClick: () => navigate(ROUTES.DASHBOARD) },
          { label: trip.trip_name || 'Trip' },
        ]}
      />

      <TripCard trip={trip} />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => navigate(ROUTES.TIMELINE)}>
          View timeline
        </Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.DIFF)} disabled={(trip.current_version ?? 0) < 2}>
          Review changes
        </Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.EXPLAINABILITY)}>
          Why did the AI change this?
        </Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.FEEDBACK)}>
          Give feedback
        </Button>
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle>Feedback so far</CardTitle>
        </CardHeader>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No feedback yet. Tell the planner what you would change and it will re-optimize the itinerary.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((h, i) => (
              <li key={i} className="text-sm">
                <p>“{h.message}”</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Round {h.iteration ?? i + 1}{h.timestamp ? ` · ${timeAgo(h.timestamp)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
