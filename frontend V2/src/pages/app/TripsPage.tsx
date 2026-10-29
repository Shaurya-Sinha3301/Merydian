import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFleet } from '../../features/agent/useFleet';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Photo } from '../../ui/Photo';
import { Tag } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { formatDateRange, formatMoney, timeAgo } from '../../lib/format';
import { photoForTrip } from '../../lib/photos';
import { useTitle } from '../../lib/useTitle';

type Filter = 'all' | 'waiting' | 'current';

export function TripsPage() {
  useTitle('Trips');
  const fleet = useFleet();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = fleet.items.filter((t) => {
    const waiting = fleet.waitingTrips.has(t.trip_id);
    if (filter === 'waiting' && !waiting) return false;
    if (filter === 'current' && waiting) return false;
    return (t.trip_name ?? '').toLowerCase().includes(q.trim().toLowerCase());
  });

  const seg = (id: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={`h-9 px-3 text-sm font-semibold ${filter === id ? 'bg-ink text-paper' : 'bg-paper text-ink-2 hover:bg-panel'}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Trips</h1>
        <p className="text-sm text-ink-3">
          {rows.length} of {fleet.items.length}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search trips"
          aria-label="Search trips"
          className="h-9 w-full max-w-xs rounded-sm border border-ink bg-paper px-3 text-sm"
        />
        <div className="flex divide-x divide-rule border border-rule" role="group" aria-label="Filter trips">
          {seg('all', 'All')}
          {seg('waiting', 'Needs a decision')}
          {seg('current', 'Up to date')}
        </div>
      </div>

      <div className="mt-4">
        {fleet.isLoading && <Loading label="Loading trips" />}
        {fleet.error && <ErrorNote>Trips could not be loaded.</ErrorNote>}
        {!fleet.isLoading && !fleet.error && fleet.items.length === 0 && (
          <Empty title="No trips yet">Trips appear here once they are set up.</Empty>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto border border-rule bg-paper">
            <table className="ruled min-w-[56rem]">
              <caption className="sr-only">Trips you oversee</caption>
              <thead>
                <tr>
                  <th className="w-24" />
                  <th>Trip</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th className="num">Version</th>
                  <th className="num">Feedback</th>
                  <th className="num">Cost</th>
                  <th className="num">Fit</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.trip_id}>
                    <td className="!py-1.5">
                      <Photo photo={photoForTrip(t.trip_name)} alt="" className="h-12 w-20" />
                    </td>
                    <th scope="row" className="!border-b !border-rule !px-3 !py-2 text-left !text-sm !normal-case !tracking-normal !text-ink">
                      <Link to={tripPath(t.trip_id)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                        {t.trip_name || 'Untitled trip'}
                      </Link>
                      <p className="text-xs font-normal text-ink-3">{t.destination}</p>
                    </th>
                    <td className="whitespace-nowrap text-ink-2">{formatDateRange(t.start_date, t.end_date)}</td>
                    <td>{fleet.waitingTrips.has(t.trip_id) ? <Tag tone="pending">Needs a decision</Tag> : <Tag>Up to date</Tag>}</td>
                    <td className="num">v{t.current_version ?? 1}</td>
                    <td className="num">{t.feedback_count ?? 0}</td>
                    <td className="num font-semibold">{formatMoney(t.total_cost)}</td>
                    <td className="num">{t.total_satisfaction != null ? `${Math.round(t.total_satisfaction * 10)}%` : '—'}</td>
                    <td className="whitespace-nowrap text-ink-3">{timeAgo(t.last_updated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {fleet.items.length > 0 && rows.length === 0 && <Empty title="No trips match">Clear the search or the filter.</Empty>}
      </div>
    </div>
  );
}
