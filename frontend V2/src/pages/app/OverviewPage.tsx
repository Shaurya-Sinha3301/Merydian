import { Link, useNavigate } from 'react-router-dom';
import { MonthGrid } from '../../features/calendar/MonthGrid';
import { CostBars } from '../../features/agent/CostBars';
import { MonthNav } from '../../features/agent/MonthNav';
import { tripEvents, useFleet, useMonthCursor } from '../../features/agent/useFleet';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { ROUTES, tripPath } from '../../constants/routes';
import { formatDateRange, formatMoney, timeAgo } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';

export function OverviewPage() {
  useTitle('Overview');
  const navigate = useNavigate();
  const fleet = useFleet();
  const cursor = useMonthCursor(fleet.items);
  const { items, waitingJobs, waitingTrips, stats, jobList } = fleet;

  const kpis = [
    { label: 'Waiting on you', value: String(waitingJobs.length) },
    { label: 'Trips overseen', value: String(items.length) },
    { label: 'Feedback rounds', value: String(stats.rounds) },
    { label: 'Plan value', value: formatMoney(stats.totalValue) },
    { label: 'Average fit', value: stats.avgFit != null ? `${Math.round(stats.avgFit * 10)}%` : '—' },
    { label: 'Failed jobs', value: String(stats.failed) },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Overview</h1>
        <p className="text-sm text-ink-3">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {fleet.isLoading && <Loading label="Loading the desk" />}
      {fleet.error && <ErrorNote>The desk could not be loaded. The server may still be waking up.</ErrorNote>}

      <dl className="mt-4 grid grid-cols-2 border border-ink bg-paper sm:grid-cols-3 lg:grid-cols-6 [&>div]:border-b [&>div]:border-rule lg:[&>div]:border-b-0 lg:[&>div]:border-r lg:[&>div:last-child]:border-r-0">
        {kpis.map((k, i) => (
          <div key={k.label} className={`px-4 py-3 ${i === 0 ? 'bg-ink text-paper' : ''}`}>
            <dt className={`label ${i === 0 ? '!text-paper/80' : ''}`}>{k.label}</dt>
            <dd className={`mt-1 font-bold tabular-nums ${i === 0 ? 'text-4xl' : 'text-xl text-ink-2'}`}>{k.value}</dd>
          </div>
        ))}
      </dl>

      {!fleet.isLoading && items.length === 0 && (
        <div className="mt-6">
          <Empty title="No trips yet">Trips appear here once they are set up.</Empty>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <section className="border border-rule bg-paper" aria-labelledby="queue">
              <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
                <h2 id="queue" className="title text-lg">
                  Decisions waiting
                </h2>
                <Link to={ROUTES.DESK} className="text-sm font-semibold underline underline-offset-4">
                  Open the desk
                </Link>
              </div>
              {waitingJobs.length === 0 ? (
                <p className="px-4 py-6 text-ink-2">Nothing waiting. New requests appear here as agents finish preparing options.</p>
              ) : (
                <div className="overflow-x-auto"><table className="ruled">
                  <thead>
                    <tr>
                      <th>Trip</th>
                      <th>Request</th>
                      <th>Raised</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {waitingJobs.map((j) => (
                      <tr key={j.job_id}>
                        <td className="min-w-[11rem] font-semibold">{fleet.nameOf(j.trip_id)}</td>
                        <td className="min-w-[12rem] text-ink-2">
                          {typeof j.result?.summary === 'string' ? j.result.summary : 'New request'}
                        </td>
                        <td className="whitespace-nowrap text-ink-3">{timeAgo(j.updated_at)}</td>
                        <td className="whitespace-nowrap text-right">
                          <Tag tone="pending">Needs a decision</Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </section>

            <section className="border border-rule bg-paper" aria-labelledby="trips">
              <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
                <h2 id="trips" className="title text-lg">
                  Trips
                </h2>
                <Link to={ROUTES.TRIPS} className="text-sm font-semibold underline underline-offset-4">
                  All trips
                </Link>
              </div>
              <div className="overflow-x-auto"><table className="ruled">
                <thead>
                  <tr>
                    <th>Trip</th>
                    <th>Dates</th>
                    <th className="num">Version</th>
                    <th className="num">Cost</th>
                    <th className="num">Fit</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.trip_id}>
                      <td>
                        <Link to={tripPath(t.trip_id)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                          {t.trip_name || 'Untitled trip'}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-ink-2">{formatDateRange(t.start_date, t.end_date)}</td>
                      <td className="num">v{t.current_version ?? 1}</td>
                      <td className="num">{formatMoney(t.total_cost)}</td>
                      <td className="num">{t.total_satisfaction != null ? `${Math.round(t.total_satisfaction * 10)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </section>

            <section className="border border-rule bg-paper p-4" aria-labelledby="cost">
              <h2 id="cost" className="title text-lg">
                Plan cost by trip
              </h2>
              <CostBars items={items.map((t) => ({ label: t.trip_name || 'Trip', value: t.total_cost ?? 0 }))} className="mt-3" />
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
            <section className="border border-rule bg-paper p-3" aria-labelledby="cal">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 id="cal" className="title text-lg">
                  Departures
                </h2>
                <MonthNav label={cursor.label} onPrev={cursor.prev} onNext={cursor.next} />
              </div>
              <MonthGrid
                year={cursor.year}
                month={cursor.month}
                compact
                events={tripEvents(items, waitingTrips, navigate)}
              />
              <p className="mt-2 text-xs text-ink-3">
                <span className="mr-1 inline-block h-2 w-2 bg-yellow align-middle" /> needs a decision
                <span className="ml-3 mr-1 inline-block h-2 w-2 bg-cyan align-middle" /> up to date
              </p>
            </section>

            <section className="border border-rule bg-paper" aria-labelledby="recent">
              <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
                <h2 id="recent" className="title text-lg">
                  Agent activity
                </h2>
                <Link to={ROUTES.ACTIVITY} className="text-sm font-semibold underline underline-offset-4">
                  All
                </Link>
              </div>
              <ul className="divide-y divide-rule">
                {jobList.slice(0, 6).map((j) => (
                  <li key={j.job_id} className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{fleet.nameOf(j.trip_id)}</span>
                      <span className="text-ink-3"> · {j.status.toLowerCase()}</span>
                    </span>
                    <span className="shrink-0 text-ink-3">{timeAgo(j.completed_at ?? j.updated_at)}</span>
                  </li>
                ))}
                {jobList.length === 0 && <li className="px-4 py-4 text-sm text-ink-2">No agent activity yet.</li>}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
