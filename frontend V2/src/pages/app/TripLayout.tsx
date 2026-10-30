import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useTripSummary } from '../../hooks/useTrips';
import { useTripPlan } from '../../hooks/useTripData';
import { useTripGroup } from '../../hooks/usePhase3';
import { useAuthStore } from '../../stores/auth.store';
import { changesPath, feedbackPath, groupPath, historyPath, notesPath, tripBookingsPath, ROUTES, tripPath } from '../../constants/routes';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Photo } from '../../ui/Photo';
import { ButtonLink } from '../../ui/Button';
import { formatDateRange, formatMoney } from '../../lib/format';
import { leadPhoto, photoForTrip } from '../../lib/photos';
import { useTitle } from '../../lib/useTitle';

export function TripLayout() {
  const { tripId = '' } = useParams();
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const { data: trip, isLoading, error } = useTripSummary(tripId);
  const plan = useTripPlan(tripId);
  const group = useTripGroup(tripId);
  useTitle(trip?.trip_name ?? 'Trip');

  if (isLoading) return <Loading label="Loading the trip" />;
  if (error || !trip) {
    return (
      <Empty
        title="We could not open that trip"
        action={<ButtonLink to={isAgent ? ROUTES.TRIPS : ROUTES.APP}>Back to your trips</ButtonLink>}
      >
        It may belong to another family, or the server is still waking up.
      </Empty>
    );
  }

  const cover = photoForTrip(trip.trip_name) ?? leadPhoto(plan.days.flatMap((d) => d.stops.map((s) => s.id)));
  const tabs = [
    { to: tripPath(tripId), label: 'Plan', end: true },
    { to: changesPath(tripId), label: 'Changes', end: false },
    { to: historyPath(tripId), label: 'History', end: false },
    ...(group.data && group.data.families.length > 1 ? [{ to: groupPath(tripId), label: 'Group', end: false }] : []),
    { to: tripBookingsPath(tripId), label: 'Bookings', end: false },
    ...(isAgent ? [{ to: notesPath(tripId), label: 'Notes', end: false }] : []),
    { to: feedbackPath(tripId), label: 'Feedback', end: false },
  ];
  const rounds = trip.feedback_count ?? 0;

  return (
    <div>
      {isAgent && (
        <Link to={ROUTES.TRIPS} className="mb-3 inline-block text-sm font-semibold underline underline-offset-4">
          All trips
        </Link>
      )}

      <header className="grid gap-4 border border-ink bg-paper sm:grid-cols-[14rem_1fr]">
        <Photo photo={cover} alt={cover ? `${cover.name}, Delhi` : ''} priority className="h-40 sm:h-full sm:min-h-40" />
        <div className="p-4 sm:py-4 sm:pl-0 sm:pr-5">
          <h1 className="display text-3xl sm:text-4xl">{trip.trip_name || 'Untitled trip'}</h1>
          <p className="mt-1 text-sm text-ink-2">{trip.destination || 'Destination to be confirmed'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-rule pt-3 sm:grid-cols-4">
            <div>
              <dt className="label">Dates</dt>
              <dd className="text-sm font-semibold">{formatDateRange(trip.start_date, trip.end_date)}</dd>
            </div>
            <div>
              <dt className="label">Version</dt>
              <dd className="text-sm font-semibold">{trip.current_version != null ? `v${trip.current_version}` : '—'}</dd>
            </div>
            <div>
              <dt className="label">Plan cost</dt>
              <dd className="text-sm font-semibold tabular-nums">{formatMoney(trip.total_cost)}</dd>
            </div>
            <div>
              <dt className="label">Feedback</dt>
              <dd className="text-sm font-semibold">{rounds === 0 ? 'None yet' : `${rounds} round${rounds === 1 ? '' : 's'}`}</dd>
            </div>
          </dl>
        </div>
      </header>

      <nav aria-label="Trip" className="mt-4 flex border-b border-rule">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `-mb-px flex h-11 flex-1 items-center justify-center border-b-2 text-sm font-semibold sm:flex-none sm:px-6 ${
                isActive ? 'border-magenta text-ink' : 'border-transparent text-ink-2 hover:text-ink'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
      {error && <ErrorNote>Something went wrong loading this trip.</ErrorNote>}
    </div>
  );
}
