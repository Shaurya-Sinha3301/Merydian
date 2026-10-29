import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DayTimeline, type TimelineStop } from '../../features/plan/DayTimeline';
import { TripMap } from '../../features/plan/TripMap';
import { useTripChanges, useTripPlan } from '../../hooks/useTripData';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Photo, Bands, PhotoCaption } from '../../ui/Photo';
import { changesPath } from '../../constants/routes';
import { clockLabel, planRange, toMinutes, type Stop } from '../../lib/plan';
import { leadPhoto, photoForStop } from '../../lib/photos';
import { formatMoney, formatSignedMoney } from '../../lib/format';

function pick(value: unknown, key: string): string | undefined {
  if (value && typeof value === 'object') {
    const v = (value as Record<string, unknown>)[key];
    return v == null ? undefined : String(v);
  }
  return undefined;
}

export function PlanPage() {
  const { tripId = '' } = useParams();
  const plan = useTripPlan(tripId);
  const changes = useTripChanges(tripId);
  const [picked, setPicked] = useState<number | null>(null);

  const addedIds = new Set<string>();
  const addedNames = new Set<string>();
  (changes.diff?.added_activities ?? []).forEach((a) => {
    const id = pick(a.after, 'location_id') ?? pick(a.after, 'poi_id');
    const n = pick(a.after, 'name');
    if (id) addedIds.add(id);
    if (n) addedNames.add(n);
  });

  const droppedByDay: Record<number, Stop[]> = {};
  (changes.diff?.removed_activities ?? []).forEach((r, i) => {
    const name = pick(r.before, 'name');
    const day = Number(/day (\d+)/i.exec(r.reason ?? '')?.[1] ?? 0);
    if (!name || !day) return;
    const start = toMinutes(pick(r.before, 'time_window_start')) ?? 9 * 60;
    const end = toMinutes(pick(r.before, 'time_window_end')) ?? start + 60;
    (droppedByDay[day] ??= []).push({
      id: pick(r.before, 'location_id') ?? pick(r.before, 'poi_id') ?? `dropped-${i}`,
      title: name,
      start,
      end,
      category: pick(r.before, 'category') === 'meal' ? 'meal' : 'activity',
    });
  });

  if (plan.isLoading) return <Loading label="Loading the plan" />;
  if (plan.error) return <ErrorNote>The plan could not be loaded. Check the server and try again.</ErrorNote>;
  if (plan.days.length === 0) {
    return <Empty title="No plan yet">An itinerary has not been generated for this trip.</Empty>;
  }

  const active = picked ?? plan.days[0].day;
  const day = plan.days.find((d) => d.day === active) ?? plan.days[0];
  const ghosts = droppedByDay[day.day] ?? [];

  const stops: TimelineStop[] = [
    ...day.stops.map((s, i) => ({ ...s, n: i + 1, tone: addedNames.has(s.title) ? ('added' as const) : undefined })),
    ...ghosts.map((g) => ({ ...g, tone: 'removed' as const })),
  ].sort((a, b) => a.start - b.start);

  const [lo, hi] = planRange([...plan.days, { day: 0, stops: Object.values(droppedByDay).flat() }]);
  const cover = leadPhoto(day.stops.map((s) => s.id)) ?? leadPhoto(day.stops.map((s) => s.title));
  const first = day.stops[0]?.start;
  const last = day.stops[day.stops.length - 1]?.end;
  const newCount = stops.filter((s) => s.tone === 'added').length;
  const colors: Record<string, string> = {};
  addedIds.forEach((id) => (colors[id] = '#3cb043'));

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div role="tablist" aria-label="Days" className="flex gap-2 overflow-x-auto pb-1">
          {plan.days.map((d) => (
            <button
              key={d.day}
              role="tab"
              aria-selected={d.day === day.day}
              onClick={() => setPicked(d.day)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-extrabold ${
                d.day === day.day ? 'bg-ink text-paper' : 'bg-paper text-ink shadow-[var(--shadow-card)] hover:bg-yellow'
              }`}
            >
              Day {d.day}
              <span className={`ml-2 text-xs font-bold ${d.day === day.day ? 'opacity-80' : 'text-ink-3'}`}>
                {d.stops.length} stops
              </span>
            </button>
          ))}
        </div>

        <Photo photo={cover} alt={cover ? `${cover.name}, Delhi` : ''} scrim priority className="mt-4 h-44 rounded-3xl sm:h-52">
          <Bands width="16%" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-5 text-paper">
            <div>
              <p className="text-sm font-bold opacity-90">{cover ? `Starts near ${cover.name}` : 'Itinerary'}</p>
              <h2 className="display text-5xl sm:text-6xl">Day {day.day}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5 pr-[16%]">
              {first != null && last != null && (
                <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-bold text-ink">
                  {clockLabel(first)} to {clockLabel(last)}
                </span>
              )}
              {newCount > 0 && <span className="rounded-full bg-green px-2.5 py-1 text-xs font-bold text-ink">{newCount} new</span>}
              {ghosts.length > 0 && (
                <span className="rounded-full bg-magenta px-2.5 py-1 text-xs font-bold text-paper">{ghosts.length} dropped</span>
              )}
            </div>
          </div>
        </Photo>
        <PhotoCaption photo={cover} className="mt-1 text-ink-3" />

        <div className="mt-4">
          <DayTimeline stops={stops} lo={lo} hi={hi} />
        </div>
      </div>

      <aside className="lg:col-span-5">
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <TripMap
            label={`Map of day ${day.day}`}
            points={day.stops.map((s) => ({ id: s.id, title: s.title }))}
            ghosts={ghosts.map((g) => ({ id: g.id, title: g.title }))}
            colors={colors}
            className="h-72 rounded-3xl shadow-[var(--shadow-card)] sm:h-80"
          />

          <section className="rounded-3xl bg-paper p-5 shadow-[var(--shadow-card)]" aria-label="This version">
            <h3 className="title text-xl">This version</h3>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-panel p-2">
                <dt className="label">Plan cost</dt>
                <dd className="text-lg font-extrabold">{formatMoney(changes.trip?.total_cost)}</dd>
              </div>
              <div className="rounded-xl bg-panel p-2">
                <dt className="label">vs last</dt>
                <dd className="text-lg font-extrabold">
                  {changes.diff?.cost_delta != null ? formatSignedMoney(changes.diff.cost_delta) : '—'}
                </dd>
              </div>
              <div className="rounded-xl bg-panel p-2">
                <dt className="label">Fit</dt>
                <dd className="text-lg font-extrabold">
                  {changes.diff?.satisfaction_delta != null
                    ? `${changes.diff.satisfaction_delta >= 0 ? '+' : ''}${changes.diff.satisfaction_delta.toFixed(2)}`
                    : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-ink-2">
              Day {day.day} has {day.stops.length} stops. {photoForStop(day.stops[0]?.id) ? '' : ''}
              Numbers show the stop order on the map.
            </p>
          </section>

          {changes.previous && (
            <Link to={changesPath(tripId)} className="block rounded-3xl bg-cyan p-5 text-ink hover:bg-ink hover:text-paper">
              <p className="title text-2xl">Version {changes.current} changed this plan</p>
              <p className="mt-1 font-bold">{addedIds.size} new stops and {Object.values(droppedByDay).flat().length} dropped.</p>
              <p className="mt-3 text-sm font-bold underline underline-offset-4 decoration-2">See what changed and why</p>
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
