import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../../hooks/useDecisions';
import { COLORS, Columns, Lines, Scatter, Split } from '../../features/insights/charts';
import { CostBars } from '../../features/agent/CostBars';
import { ErrorNote, Loading } from '../../ui/Surface';
import { ROUTES, tripPath } from '../../constants/routes';
import { formatMoney, formatSignedMoney } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';

const JOB_NAMES: Record<string, string> = {
  AGENT_FEEDBACK: 'Feedback agent',
  AGENT_TOOLS: 'Tools agent',
  AGENT_COMMUNICATION: 'Communication agent',
};

function Panel({ title, note, children, className = '' }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 border border-rule bg-paper ${className}`} aria-label={title}>
      <div className="border-b-2 border-ink px-4 py-2.5">
        <h2 className="title text-lg">{title}</h2>
        {note && <p className="text-xs text-ink-3">{note}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
}

function hours(h: number | null | undefined): string {
  if (h == null) return '—';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${Math.round(h / 24)} d`;
}

export function InsightsPage() {
  useTitle('Insights');
  const { data, isLoading, error } = useAnalytics();

  if (isLoading) return <Loading label="Crunching the numbers" />;
  if (error || !data) return <ErrorNote>The insights could not be loaded. The server may still be waking up.</ErrorNote>;

  const { totals: t, approvals: a, jobs, stops, customers } = data;
  const published = data.trips.filter((r) => r.cost != null);
  const net = (t.added_by_replanning ?? 0) - (t.saved_by_replanning ?? 0);

  const kpis: Array<{ label: string; value: string; sub?: string }> = [
    { label: 'Plan value', value: formatMoney(t.plan_value), sub: `${t.published_trips} published trips` },
    { label: 'Average trip', value: formatMoney(t.avg_cost), sub: `${formatMoney(t.avg_cost_per_day)} a day` },
    { label: 'Per traveller', value: formatMoney(t.avg_cost_per_traveller), sub: `${t.travellers} travellers, ${t.children} children` },
    { label: 'Average fit', value: t.avg_fit != null ? `${Math.round(t.avg_fit)}%` : '—', sub: `${t.avg_versions ?? '—'} versions a trip` },
    { label: 'Saved by re-planning', value: formatMoney(t.saved_by_replanning), sub: `${formatMoney(t.added_by_replanning)} added elsewhere` },
    { label: 'Acceptance rate', value: a.acceptance_rate != null ? `${a.acceptance_rate}%` : '—', sub: `${a.accepted} accepted, ${a.declined} declined` },
    { label: 'Median decision time', value: hours(a.median_hours_to_decide), sub: a.pending ? `${a.pending} waiting` : 'nothing waiting' },
    { label: 'Agent job success', value: jobs.success_rate != null ? `${jobs.success_rate}%` : '—', sub: `${jobs.total} jobs run` },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Insights</h1>
        <p className="text-sm text-ink-3">
          From {data.trips.length} trips, {a.accepted + a.declined + a.pending} decisions and {jobs.total} agent jobs. Updated{' '}
          {new Date(data.generated_at + 'Z').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 border border-ink bg-paper sm:grid-cols-4 [&>div]:border-b [&>div]:border-rule [&>div]:p-3 sm:[&>div:nth-child(4n+1)]:border-l-0 sm:[&>div]:border-l">
        {kpis.map((k, i) => (
          <div key={k.label} className={i % 4 === 0 ? 'sm:border-l-0' : ''}>
            <dt className="label">{k.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{k.value}</dd>
            {k.sub && <dd className="text-xs text-ink-3">{k.sub}</dd>}
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Panel title="Departures and plan value by month" note="Trips by start date, value in rupees" className="lg:col-span-5">
          {data.by_month.length ? (
            <Columns label="Plan value by month" items={data.by_month.map((m) => ({ label: monthLabel(m.month), value: m.value ?? 0 }))} />
          ) : (
            <p className="text-sm text-ink-2">No dated trips yet.</p>
          )}
        </Panel>

        <Panel title="Decision queue" note="Everything the agents proposed" className="lg:col-span-3">
          <Split
            label="Decision outcomes"
            parts={[
              { label: 'Accepted', value: a.accepted, color: COLORS.forest },
              { label: 'Declined', value: a.declined, color: COLORS.red },
              { label: 'Waiting', value: a.pending, color: COLORS.amber },
            ]}
          />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm">
            <div>
              <dt className="label">First plans</dt>
              <dd className="text-lg font-bold tabular-nums">{a.first_plans}</dd>
            </div>
            <div>
              <dt className="label">Change requests</dt>
              <dd className="text-lg font-bold tabular-nums">{a.change_requests}</dd>
            </div>
            <div>
              <dt className="label">Approved value</dt>
              <dd className="text-lg font-bold tabular-nums">{formatMoney(a.approved_value)}</dd>
            </div>
            <div>
              <dt className="label">Oldest waiting</dt>
              <dd className="text-lg font-bold tabular-nums">{hours(a.oldest_pending_hours)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Agent reliability" note="Jobs by agent" className="lg:col-span-4">
          <table className="ruled">
            <thead>
              <tr>
                <th>Agent</th>
                <th className="num">Jobs</th>
                <th className="num">Failed</th>
                <th className="num">Retried</th>
                <th className="num">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {jobs.by_type.map((j) => (
                <tr key={j.job_type}>
                  <td className="font-semibold">{JOB_NAMES[j.job_type] ?? j.job_type}</td>
                  <td className="num">{j.total}</td>
                  <td className={`num ${j.failed ? 'text-magenta' : ''}`}>{j.failed}</td>
                  <td className="num">{j.retried}</td>
                  <td className="num">{j.avg_seconds != null ? `${Math.round(j.avg_seconds)} s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Cost across versions" note="Each line is a trip; each step is a re-plan" className="lg:col-span-5">
          <Lines
            label="Cost by version"
            series={data.version_lines.map((l) => ({
              name: l.trip_name || 'Trip',
              points: l.points.filter((p) => p.cost != null).map((p) => ({ x: p.version, y: p.cost as number })),
            }))}
          />
        </Panel>

        <Panel title="Cost against fit" note="One square per trip. Hover for the trip" className="lg:col-span-4">
          <Scatter
            label="Plan cost against fit"
            points={published.filter((r) => r.fit != null).map((r) => ({ name: r.trip_name || 'Trip', x: r.cost as number, y: (r.fit as number) }))}
          />
        </Panel>

        <Panel title="Last 14 days" note="Feedback received (navy) and re-plans (amber)" className="lg:col-span-3">
          <Columns
            label="Activity in the last 14 days"
            height={170}
            format={(n) => String(Math.round(n))}
            items={data.activity.map((d) => ({ label: d.day.slice(8), value: d.feedback, second: d.replans }))}
          />
        </Panel>

        <Panel title="Most scheduled stops" note="Across every current plan" className="lg:col-span-4">
          <CostBars format={(n) => `${n}×`} items={stops.most_scheduled.map((s) => ({ label: s.name.replace(/ \((Lunch|Dinner)\)/, ''), value: s.count }))} />
        </Panel>

        <Panel title="What re-planning changes" note="Stops added or dropped between versions" className="lg:col-span-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="label text-green">Added most</p>
              <ol className="mt-2 divide-y divide-rule">
                {stops.most_added.slice(0, 6).map((s) => (
                  <li key={s.location_id} className="flex justify-between gap-2 py-1.5">
                    <span className="truncate">{s.name}</span>
                    <span className="font-semibold tabular-nums">{s.count}</span>
                  </li>
                ))}
                {stops.most_added.length === 0 && <li className="py-1.5 text-ink-3">None yet</li>}
              </ol>
            </div>
            <div>
              <p className="label text-magenta">Dropped most</p>
              <ol className="mt-2 divide-y divide-rule">
                {stops.most_dropped.slice(0, 6).map((s) => (
                  <li key={s.location_id} className="flex justify-between gap-2 py-1.5">
                    <span className="truncate">{s.name}</span>
                    <span className="font-semibold tabular-nums">{s.count}</span>
                  </li>
                ))}
                {stops.most_dropped.length === 0 && <li className="py-1.5 text-ink-3">None yet</li>}
              </ol>
            </div>
          </div>
        </Panel>

        <Panel title="Entry spend by category" note="Ticket cost times party size, current plans" className="lg:col-span-4">
          <CostBars items={stops.by_category.map((c) => ({ label: `${c.category} (${c.stops})`, value: c.cost ?? 0 }))} />
          <p className="mt-3 border-t border-rule pt-2 text-xs text-ink-3">
            Re-planning moved plan value by {formatSignedMoney(net)} net across {t.replanned_trips} trips.
          </p>
        </Panel>

        <Panel title="Who is travelling" note="Saved preferences of the families on trips" className="lg:col-span-4">
          <p className="label">Average interest</p>
          <CostBars className="mt-2" format={(n) => `${n}%`} items={customers.interests.slice(0, 6).map((i) => ({ label: i.interest, value: i.average ?? 0 }))} />
        </Panel>

        <Panel title="Party size and pace" className="lg:col-span-4">
          <p className="label">Families by party size</p>
          <CostBars className="mt-2" format={(n) => String(n)} items={customers.party_sizes.map((p) => ({ label: `${p.size} traveller${p.size === 1 ? '' : 's'}`, value: p.families }))} />
          <p className="label mt-4">Families by pace</p>
          <CostBars className="mt-2" format={(n) => String(n)} items={customers.pace.map((p) => ({ label: p.pace, value: p.families }))} />
        </Panel>

        <Panel title="Children" className="lg:col-span-4">
          <p className="text-4xl font-bold tabular-nums">{customers.children_share != null ? `${customers.children_share}%` : '—'}</p>
          <p className="mt-1 text-sm text-ink-2">of all travellers on current trips are children.</p>
          <p className="mt-4 border-t border-rule pt-3 text-sm text-ink-2">
            {t.children} of {t.travellers} travellers. Plans for these families lean on child-friendly and shorter days, which shows in the fit scores above.
          </p>
        </Panel>
      </div>

      <section className="mt-6 border border-rule bg-paper" aria-label="Trip performance">
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
          <h2 className="title text-lg">Trip performance</h2>
          <Link to={ROUTES.TRIPS} className="text-sm font-semibold underline underline-offset-4">
            All trips
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="ruled min-w-[54rem]">
            <thead>
              <tr>
                <th>Trip</th>
                <th className="num">Days</th>
                <th className="num">Travellers</th>
                <th className="num">Versions</th>
                <th className="num">Feedback</th>
                <th className="num">Cost</th>
                <th className="num">Since v1</th>
                <th className="num">Per day</th>
                <th className="num">Per traveller</th>
                <th className="num">Fit</th>
              </tr>
            </thead>
            <tbody>
              {data.trips.map((r) => {
                const change = r.cost != null && r.first_cost != null && r.versions > 1 ? r.cost - r.first_cost : null;
                return (
                  <tr key={r.trip_id}>
                    <td>
                      <Link to={tripPath(r.trip_id)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                        {r.trip_name || 'Untitled trip'}
                      </Link>
                    </td>
                    <td className="num">{r.days ?? '—'}</td>
                    <td className="num">
                      {r.members}
                      {r.children ? <span className="text-ink-3"> ({r.children})</span> : null}
                    </td>
                    <td className="num">{r.versions}</td>
                    <td className="num">{r.feedback}</td>
                    <td className="num font-semibold">{formatMoney(r.cost)}</td>
                    <td className={`num ${change && change < 0 ? 'text-green' : change && change > 0 ? 'text-magenta' : ''}`}>{change == null ? '—' : formatSignedMoney(change)}</td>
                    <td className="num">{formatMoney(r.per_day)}</td>
                    <td className="num">{formatMoney(r.per_traveller)}</td>
                    <td className="num">{r.fit != null ? `${Math.round(r.fit)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
