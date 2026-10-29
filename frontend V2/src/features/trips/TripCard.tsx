import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { ProgressRing } from '../../components/ui/ProgressRing';
import type { TripDetailResponse } from '../../types/dto/trip';
import { formatDateRange, formatMoney, satisfactionPercent } from '../../lib/format';

interface TripCardProps {
  trip: TripDetailResponse;
  onClick?: () => void;
}

type CardStatus = 'active' | 'completed' | 'cancelled' | 'draft';

function toStatus(status?: string): CardStatus {
  return status === 'completed' || status === 'cancelled' || status === 'draft' ? status : 'active';
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const health = satisfactionPercent(trip);
  const stats = [
    { label: 'Plan cost', value: formatMoney(trip.total_cost) },
    { label: 'Days', value: trip.duration_days != null ? String(trip.duration_days) : '—' },
    { label: 'Itinerary version', value: trip.current_version != null ? `v${trip.current_version}` : '—' },
    { label: 'Feedback rounds', value: String(trip.feedback_count ?? 0) },
  ];

  return (
    <Card onClick={onClick} padding="md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {trip.trip_name || 'Untitled trip'}
            </h3>
            <StatusBadge status={toStatus(trip.status)} />
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            {trip.destination || 'Destination to be confirmed'} · {formatDateRange(trip.start_date, trip.end_date)}
          </p>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{s.label}</dt>
                <dd className="text-sm font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {trip.total_satisfaction != null && (
          <div className="shrink-0 text-center">
            <ProgressRing value={health} size={64} strokeWidth={6} label={`${health}`} />
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted-foreground)' }}>Fit score</p>
          </div>
        )}
      </div>
    </Card>
  );
}
