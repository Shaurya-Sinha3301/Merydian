import { Link } from 'react-router-dom';
import { useTrips } from '../../hooks/useTrips';
import { useAgentJobs } from '../../hooks/useAgentJobs';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Photo, Bands } from '../../ui/Photo';
import { Tag } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { formatDateRange, formatMoney } from '../../lib/format';
import { photoForTrip } from '../../lib/photos';
import { useTitle } from '../../lib/useTitle';

export function TripsPage() {
  useTitle('Trips');
  const { data, isLoading, error } = useTrips(100, 0);
  const trips = data?.items ?? [];
  const jobs = useAgentJobs(100, 0);
  const waiting = new Set(
    (jobs.data?.jobs ?? []).filter((j) => j.result?.awaiting_approval === true && j.trip_id).map((j) => j.trip_id as string),
  );

  return (
    <div>
      <h1 className="display text-[2.4rem] sm:text-[3.6rem]">
        {trips.length} <span className="mark mark-cyan">{trips.length === 1 ? 'trip' : 'trips'}</span>.
      </h1>
      <p className="mt-2 max-w-[60ch] text-lg text-ink-2">Every trip you oversee, with where its plan stands.</p>

      <div className="mt-6">
        {isLoading && <Loading label="Loading trips" />}
        {error && <ErrorNote>Trips could not be loaded.</ErrorNote>}
        {!isLoading && !error && trips.length === 0 && <Empty title="No trips yet">Trips appear here once they are set up.</Empty>}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <li key={t.trip_id}>
              <Link
                to={tripPath(t.trip_id)}
                className="group block overflow-hidden rounded-3xl bg-paper shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <Photo photo={photoForTrip(t.trip_name)} alt="" scrim className="h-44">
                  <Bands width="18%" />
                  <div className="absolute inset-x-0 bottom-0 p-4 pr-[20%] text-paper">
                    <h2 className="text-xl font-extrabold leading-tight">{t.trip_name || 'Untitled trip'}</h2>
                    <p className="text-sm font-bold opacity-90">{t.destination}</p>
                  </div>
                </Photo>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                  {waiting.has(t.trip_id) ? <Tag tone="pending">Needs a decision</Tag> : <Tag>Up to date</Tag>}
                  <span className="text-sm font-bold">{formatMoney(t.total_cost)}</span>
                  <span className="text-sm text-ink-2">v{t.current_version ?? 1}</span>
                  <span className="text-sm text-ink-2">{t.feedback_count ?? 0} feedback</span>
                  <span className="w-full text-sm text-ink-3">{formatDateRange(t.start_date, t.end_date)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
