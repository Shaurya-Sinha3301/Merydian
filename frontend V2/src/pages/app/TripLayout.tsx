import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useTripSummary } from '../../hooks/useTrips';
import { useTripPlan } from '../../hooks/useTripData';
import { useAuthStore } from '../../stores/auth.store';
import { changesPath, feedbackPath, ROUTES, tripPath } from '../../constants/routes';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Photo, Bands } from '../../ui/Photo';
import { ButtonLink } from '../../ui/Button';
import { formatDateRange, formatMoney } from '../../lib/format';
import { leadPhoto, photoForTrip } from '../../lib/photos';
import { useTitle } from '../../lib/useTitle';

export function TripLayout() {
  const { tripId = '' } = useParams();
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const { data: trip, isLoading, error } = useTripSummary(tripId);
  const plan = useTripPlan(tripId);
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
    { to: feedbackPath(tripId), label: 'Feedback', end: false },
  ];
  const rounds = trip.feedback_count ?? 0;

  return (
    <div>
      {isAgent && (
        <Link to={ROUTES.TRIPS} className="mb-3 inline-block text-sm font-bold underline underline-offset-4 decoration-2">
          All trips
        </Link>
      )}

      <Photo photo={cover} alt={cover ? `${cover.name}, Delhi` : ''} scrim priority className="h-52 rounded-3xl sm:h-64">
        <Bands width="20%" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-paper sm:p-7">
          <div className="flex flex-wrap items-center gap-2 pr-[20%]">
            {trip.current_version != null && (
              <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-bold text-ink">Version {trip.current_version}</span>
            )}
            <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-bold text-ink">
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
            {trip.total_cost != null && (
              <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-bold text-ink">{formatMoney(trip.total_cost)}</span>
            )}
          </div>
          <h1 className="display mt-2 pr-[20%] text-[2.2rem] sm:text-[3.4rem]">{trip.trip_name || 'Untitled trip'}</h1>
          <p className="mt-1 pr-[20%] text-sm font-bold opacity-90">
            {trip.destination || 'Destination to be confirmed'}
            {' · '}
            {rounds === 0 ? 'No feedback yet' : `${rounds} round${rounds === 1 ? '' : 's'} of feedback`}
          </p>
        </div>
      </Photo>

      <nav aria-label="Trip" className="mt-4 grid grid-cols-3 gap-2 sm:inline-flex">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex h-11 items-center justify-center rounded-xl text-base font-extrabold sm:px-6 ${
                isActive ? 'bg-ink text-paper' : 'bg-paper text-ink shadow-[var(--shadow-card)] hover:bg-yellow'
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
