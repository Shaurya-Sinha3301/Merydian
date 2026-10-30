import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentOptions, useApproveOption } from '../../hooks/useAgentJobs';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../ui/Button';
import { queryKeys } from '../../constants/queryKeys';
import { Link, useParams } from 'react-router-dom';
import { DayTimeline, type TimelineStop } from '../../features/plan/DayTimeline';
import { TripMap } from '../../features/plan/TripMap';
import { useTripChanges, useTripPlan } from '../../hooks/useTripData';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { downloadIcs } from '../../lib/exporters';
import { MonthGrid } from '../../features/calendar/MonthGrid';
import { parseDay } from '../../features/agent/useFleet';
import { changesPath } from '../../constants/routes';
import { clockLabel, planRange, toMinutes, type Stop } from '../../lib/plan';
import { leadPhoto } from '../../lib/photos';
import { formatMoney, formatSignedMoney } from '../../lib/format';

/** A trip whose first plan has not been approved: the agent can approve it here, the traveller is told it is coming. */
function NoPlanYet({ tripId }: { tripId: string }) {
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const qc = useQueryClient();
  const options = useAgentOptions(isAgent ? `trip_init_${tripId}` : undefined);
  const approve = useApproveOption();
  const pending = options.data?.options.find((o) => o.status === 'PENDING');

  if (!isAgent) {
    return (
      <Empty title="Your plan is with your travel agent">
        The first plan for this trip has been built and is waiting for approval. It appears here as soon as your agent approves it.
      </Empty>
    );
  }
  return (
    <Empty
      title="The first plan is waiting for approval"
      action={
        pending ? (
          <Button
            variant="cyan"
            loading={approve.isPending}
            onClick={() =>
              approve.mutate(pending.option_id, {
                onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeys.timeline, tripId] }),
              })
            }
          >
            Approve and publish
          </Button>
        ) : undefined
      }
    >
      {pending
        ? `Estimated cost ${formatMoney(pending.cost)}, predicted fit ${Math.round(pending.satisfaction * 100)}%. Nothing reaches the family until you approve it.`
        : options.isLoading
          ? 'Looking for the first plan.'
          : 'No itinerary has been generated for this trip yet.'}
    </Empty>
  );
}

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
    return <NoPlanYet tripId={tripId} />;
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
  const tripStart = parseDay(changes.trip?.start_date);
  const tripEnd = parseDay(changes.trip?.end_date);
  const colors: Record<string, string> = {};
  addedIds.forEach((id) => (colors[id] = '#3cb043'));

  return (
    <div className="grid gap-x-6 gap-y-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-7">
        <div role="tablist" aria-label="Days" className="flex overflow-x-auto border border-rule bg-paper">
          {plan.days.map((d) => (
            <button
              key={d.day}
              role="tab"
              aria-selected={d.day === day.day}
              onClick={() => setPicked(d.day)}
              className={`shrink-0 border-r border-rule px-4 py-2 text-sm font-semibold ${
                d.day === day.day ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-panel'
              }`}
            >
              Day {d.day}
              <span className={`ml-2 text-xs font-normal ${d.day === day.day ? 'text-paper/80' : 'text-ink-3'}`}>{d.stops.length} stops</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="display text-3xl">Day {day.day}</h2>
            <p className="text-sm text-ink-2">
              {first != null && last != null ? `${clockLabel(first)} to ${clockLabel(last)}` : 'Itinerary'}
              {cover ? ` · starts near ${cover.name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="no-print flex gap-1.5">
              <button
                type="button"
                disabled={!tripStart}
                onClick={() => tripStart && downloadIcs(changes.trip?.trip_name || 'Trip', tripStart, plan.days)}
                className="h-7 border border-rule bg-paper px-2.5 text-xs font-semibold hover:border-ink disabled:opacity-50"
              >
                Add to calendar
              </button>
              <button type="button" onClick={() => window.print()} className="h-7 border border-rule bg-paper px-2.5 text-xs font-semibold hover:border-ink">
                Print
              </button>
            </span>
            {newCount > 0 && <Tag tone="added">{newCount} added</Tag>}
            {ghosts.length > 0 && <Tag tone="removed">{ghosts.length} withdrawn</Tag>}
          </div>
        </div>

        <div className="mt-3">
          <DayTimeline stops={stops} lo={lo} hi={hi} />
        </div>

        <section className="mt-6 border border-rule bg-paper" aria-labelledby="days">
          <h3 id="days" className="title border-b-2 border-ink px-4 py-2.5 text-lg">
            Day by day
          </h3>
          <div className="overflow-x-auto">
            <table className="ruled min-w-[28rem]">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="num">Stops</th>
                  <th>Runs</th>
                  <th className="num">Hours out</th>
                  <th>Version change</th>
                </tr>
              </thead>
              <tbody>
                {plan.days.map((d) => {
                  const a = d.stops[0]?.start;
                  const z = d.stops[d.stops.length - 1]?.end;
                  const added = d.stops.filter((x) => addedNames.has(x.title)).length;
                  const withdrawn = (droppedByDay[d.day] ?? []).length;
                  return (
                    <tr key={d.day} className={d.day === day.day ? 'bg-panel' : ''}>
                      <td>
                        <button type="button" onClick={() => setPicked(d.day)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                          Day {d.day}
                        </button>
                      </td>
                      <td className="num">{d.stops.length}</td>
                      <td className="whitespace-nowrap tabular-nums">{a != null && z != null ? `${clockLabel(a)} to ${clockLabel(z)}` : '—'}</td>
                      <td className="num">{a != null && z != null ? ((z - a) / 60).toFixed(1) : '—'}</td>
                      <td className="whitespace-nowrap">
                        {added > 0 && <Tag tone="added">{added} added</Tag>} {withdrawn > 0 && <Tag tone="removed">{withdrawn} withdrawn</Tag>}
                        {added === 0 && withdrawn === 0 && <span className="text-ink-3">Unchanged</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="min-w-0 lg:col-span-5">
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <TripMap
            label={`Map of day ${day.day}`}
            points={day.stops.map((s) => ({ id: s.id, title: s.title }))}
            ghosts={ghosts.map((g) => ({ id: g.id, title: g.title }))}
            colors={colors}
            className="h-72 border border-rule sm:h-80"
          />

          <section className="border border-rule bg-paper" aria-label="This version">
            <h3 className="title border-b-2 border-ink px-4 py-2.5 text-lg">This version</h3>
            <dl className="grid grid-cols-3 divide-x divide-rule text-center">
              <div className="p-3">
                <dt className="label">Plan cost</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">{formatMoney(changes.trip?.total_cost)}</dd>
              </div>
              <div className="p-3">
                <dt className="label">vs last</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">
                  {changes.diff?.cost_delta != null ? formatSignedMoney(changes.diff.cost_delta) : '—'}
                </dd>
              </div>
              <div className="p-3">
                <dt className="label">Fit</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums">
                  {changes.diff?.satisfaction_delta != null
                    ? `${changes.diff.satisfaction_delta >= 0 ? '+' : ''}${changes.diff.satisfaction_delta.toFixed(2)}`
                    : '—'}
                </dd>
              </div>
            </dl>
            <p className="border-t border-rule px-4 py-2.5 text-sm text-ink-2">
              Day {day.day} has {day.stops.length} stops. Numbers match the table; meals have no map position.
            </p>
          </section>

          {tripStart && (
            <MonthGrid
              year={tripStart.getFullYear()}
              month={tripStart.getMonth()}
              compact
              events={[{ id: tripId, label: changes.trip?.trip_name || 'Trip', start: tripStart, end: tripEnd ?? tripStart, tone: 'ai' }]}
            />
          )}

          {changes.previous && (
            <Link to={changesPath(tripId)} className="block border border-ink bg-paper p-4 hover:bg-panel">
              <p className="title text-lg">Version {changes.current} corrected this plan</p>
              <p className="mt-1 text-sm text-ink-2">
                {addedIds.size} added and {Object.values(droppedByDay).flat().length} withdrawn.
              </p>
              <p className="mt-2 text-sm font-semibold underline underline-offset-4">See what changed and why</p>
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
