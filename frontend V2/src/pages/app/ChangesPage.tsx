import { useParams } from 'react-router-dom';
import { ChangeRow } from '../../features/changes/ChangeRow';
import { SwapCard } from '../../features/changes/SwapCard';
import type { Span } from '../../features/changes/SwapBars';
import { toMinutes } from '../../lib/plan';
import { useTripChanges } from '../../hooks/useTripData';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { ButtonLink } from '../../ui/Button';
import { feedbackPath } from '../../constants/routes';
import { formatSignedMoney } from '../../lib/format';
import type { DiffItemDTO } from '../../types/dto/diff';
import type { ExplanationDTO } from '../../types/dto/explainability';

function field(value: unknown, key: string): string | undefined {
  if (value && typeof value === 'object') {
    const v = (value as Record<string, unknown>)[key];
    return v == null ? undefined : String(v);
  }
  return undefined;
}

function dayOf(item: DiffItemDTO): number {
  const m = /day (\d+)/i.exec(item.reason ?? '');
  return m ? Number(m[1]) : 0;
}

function costOf(e?: ExplanationDTO): number | null {
  const c = e?.cost_delta;
  if (!c) return null;
  if (c.extra_cost != null) return c.extra_cost;
  if (c.saved_cost != null) return -c.saved_cost;
  return null;
}

export function ChangesPage() {
  const { tripId = '' } = useParams();
  const { trip, previous, current, diff, reasons, isLoading, error } = useTripChanges(tripId);

  if (isLoading) return <Loading label="Loading the changes" />;
  if (error) return <ErrorNote>The changes could not be loaded. Check the server and try again.</ErrorNote>;
  if (!previous || !diff) {
    return (
      <Empty
        title="Nothing has changed yet"
        action={<ButtonLink to={feedbackPath(tripId)}>Give feedback</ButtonLink>}
      >
        This trip has one version. Tell the planner what to change and the new plan will show up here, with the reasons.
      </Empty>
    );
  }

  // Paragraphs the AI wrote once for a whole change set read better once than on every row.
  const counts = new Map<string, number>();
  reasons.forEach((r) => counts.set(r.human_explanation, (counts.get(r.human_explanation) ?? 0) + 1));
  const shared = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])[0]?.[0];
  const lookup = (name: string | undefined, type: string) =>
    name ? reasons.find((r) => r.activity_changed === name && r.change_type === type) : undefined;
  const reasonText = (e?: ExplanationDTO) =>
    e && e.human_explanation && e.human_explanation !== shared && e.human_explanation !== 'No explanation provided'
      ? e.human_explanation
      : undefined;

  interface Item {
    name: string;
    day: number;
    span: Span;
    e?: ExplanationDTO;
  }
  const spanOf = (stop: unknown, name: string): Span => ({
    title: name,
    start: toMinutes(field(stop, 'time_window_start')) ?? 9 * 60,
    end: toMinutes(field(stop, 'time_window_end')) ?? 10 * 60,
  });
  const removed: Item[] = diff.removed_activities.map((it) => {
    const name = field(it.before, 'name') ?? 'A stop';
    return { name, day: dayOf(it), span: spanOf(it.before, name), e: lookup(name, 'POI_REMOVED') };
  });
  const added: Item[] = diff.added_activities.map((it) => {
    const name = field(it.after, 'name') ?? 'A stop';
    return { name, day: dayOf(it), span: spanOf(it.after, name), e: lookup(name, 'POI_ADDED') };
  });
  const moved = diff.time_changes.map((it) => ({
    name: field(it.after, 'name') ?? field(it.before, 'name') ?? 'A stop',
    day: dayOf(it),
  }));

  const nAdded = diff.added_activities.length;
  const nRemoved = diff.removed_activities.length;
  const nMoved = diff.time_changes.length;
  const days = [...new Set([...removed, ...added, ...moved].map((r) => r.day))].sort((a, b) => a - b);

  return (
    <div>
      <p className="label">
        Version {previous} to version {current}
        {trip?.trip_name ? `, ${trip.trip_name}` : ''}
      </p>
      <h2 className="display mt-2 text-[2.4rem] sm:text-[3.6rem]">
        {nAdded > 0 && <span className="mark mark-green">{nAdded} new</span>}
        {nAdded > 0 && (nRemoved > 0 || nMoved > 0) && ', '}
        {nRemoved > 0 && <span className="mark mark-magenta">{nRemoved} dropped</span>}
        {nRemoved > 0 && nMoved > 0 && ' and '}
        {nMoved > 0 && <span className="mark mark-yellow">{nMoved} moved</span>}
        {nAdded + nRemoved + nMoved === 0 && 'No visible changes'}.
      </h2>
      <p className="mt-4 text-lg text-ink-2">
        Plan cost {formatSignedMoney(diff.cost_delta)}
        {diff.satisfaction_delta != null && (
          <>
            , fit score {diff.satisfaction_delta >= 0 ? '+' : ''}
            {diff.satisfaction_delta.toFixed(2)}
          </>
        )}
        .
      </p>

      {shared && (
        <section className="mt-8 bg-panel p-5 sm:p-6" aria-label="The AI's explanation">
          <h3 className="title text-2xl">In the AI&apos;s words</h3>
          <p className="mt-2 max-w-[70ch] text-ink-2">{shared}</p>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-12">
        {days.map((d) => {
          const rem = removed.filter((x) => x.day === d);
          const add = added.filter((x) => x.day === d);
          const mov = moved.filter((x) => x.day === d);
          const pairCount = Math.max(rem.length, add.length);
          return (
            <section key={d} aria-label={d ? `Day ${d}` : 'Other changes'}>
              <h3 className="display border-t-4 border-ink pt-2 text-4xl sm:text-5xl">{d ? `Day ${d}` : 'Other'}</h3>
              <div className="mt-4 flex flex-col gap-4">
                {Array.from({ length: pairCount }, (_, i) => {
                  const r = rem[i];
                  const a = add[i];
                  const cost = (costOf(a?.e) ?? 0) + (costOf(r?.e) ?? 0);
                  return (
                    <SwapCard
                      key={i}
                      day={d}
                      before={r?.span}
                      after={a?.span}
                      reason={reasonText(a?.e) ?? reasonText(r?.e)}
                      costDelta={a?.e || r?.e ? cost : null}
                      tags={[...new Set([...(a?.e?.affected_constraints ?? []), ...(r?.e?.affected_constraints ?? [])])]}
                      index={i}
                    />
                  );
                })}
                {mov.length > 0 && (
                  <ChangeRow
                    tone="shifted"
                    title={`${mov.length} later stop${mov.length === 1 ? '' : 's'} moved`}
                    when={mov.map((m) => m.name).join(', ')}
                    reason="These stops start at different times because the stops before them changed."
                    index={pairCount}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
