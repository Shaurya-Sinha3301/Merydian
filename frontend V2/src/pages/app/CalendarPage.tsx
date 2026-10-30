import { Link, useNavigate } from 'react-router-dom';
import { MonthGrid } from '../../features/calendar/MonthGrid';
import { MonthNav } from '../../features/agent/MonthNav';
import { parseDay, tripEvents, useFleet, useMonthCursor } from '../../features/agent/useFleet';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { formatDateRange, formatMoney } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';

export function CalendarPage() {
  useTitle('Calendar');
  const navigate = useNavigate();
  const fleet = useFleet();
  const cursor = useMonthCursor(fleet.items);

  const inMonth = fleet.items.filter((t) => {
    const s = parseDay(t.start_date);
    const e = parseDay(t.end_date) ?? s;
    if (!s || !e) return false;
    const first = new Date(cursor.year, cursor.month, 1).getTime();
    const last = new Date(cursor.year, cursor.month + 1, 0).getTime();
    return s.getTime() <= last && e.getTime() >= first;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Calendar</h1>
        <MonthNav label={cursor.label} onPrev={cursor.prev} onNext={cursor.next} />
      </div>

      {fleet.isLoading && <Loading label="Loading trips" />}
      {fleet.error && <ErrorNote>Trips could not be loaded.</ErrorNote>}
      {!fleet.isLoading && fleet.items.length === 0 && (
        <div className="mt-6">
          <Empty title="No trips scheduled">Trips appear on the calendar once they have dates.</Empty>
        </div>
      )}

      {fleet.items.length > 0 && (
        <div className="mt-4 grid gap-6 lg:grid-cols-12">
          <MonthGrid
            className="lg:col-span-8"
            year={cursor.year}
            month={cursor.month}
            events={tripEvents(fleet.items, fleet.waitingTrips, navigate)}
          />
          <section className="border border-rule bg-paper lg:col-span-4" aria-label={`Trips in ${cursor.label}`}>
            <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">In {cursor.label}</h2>
            {inMonth.length === 0 ? (
              <p className="px-4 py-6 text-ink-2">No trips overlap this month.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {inMonth.map((t) => (
                  <li key={t.trip_id} className="px-4 py-3">
                    <Link to={tripPath(t.trip_id)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                      {t.trip_name || 'Untitled trip'}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-2">{formatDateRange(t.start_date, t.end_date)}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      {fleet.waitingTrips.has(t.trip_id) ? <Tag tone="pending">Needs a decision</Tag> : <Tag>Up to date</Tag>}
                      <span className="tabular-nums">{formatMoney(t.total_cost)}</span>
                      <span className="text-ink-3">v{t.current_version ?? 1}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
