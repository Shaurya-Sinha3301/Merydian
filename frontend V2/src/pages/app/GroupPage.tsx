import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTripGroup } from '../../hooks/usePhase3';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { formatMoney } from '../../lib/format';

const SWATCH = ['#17407f', '#c4231a', '#1f6b35', '#8a5a00', '#39424c', '#6b7a99'];

/** A group trip: one shared plan and, where a family's plan differs, its own branch. */
export function GroupPage() {
  const { tripId = '' } = useParams();
  const { data, isLoading, error } = useTripGroup(tripId);
  const [picked, setPicked] = useState<number | null>(null);

  if (isLoading) return <Loading label="Loading the group" />;
  if (error || !data) return <ErrorNote>The group could not be loaded.</ErrorNote>;
  if (data.families.length < 2) return <Empty title="This is a single-family trip">Group trips show each family's plan side by side. Ask your agent to add another family.</Empty>;

  const colour = (fid: string) => SWATCH[Math.max(0, data.families.findIndex((f) => f.family_id === fid)) % SWATCH.length];
  const name = (fid: string) => data.families.find((f) => f.family_id === fid)?.name ?? fid;
  const day = data.days.find((d) => d.day === (picked ?? data.days[0]?.day)) ?? data.days[0];
  const { shared_stops: shared, branch_stops: branch } = data.summary;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="min-w-0 border border-rule bg-paper lg:col-span-4" aria-label="Families">
        <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Families on this trip</h2>
        <ul className="divide-y divide-rule">
          {data.families.map((f) => (
            <li key={f.family_id} className="flex gap-3 px-4 py-3">
              <span aria-hidden className="mt-1.5 h-3 w-3 shrink-0" style={{ background: colour(f.family_id) }} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {f.name} {f.you && <span className="ml-1 text-xs font-normal text-ink-3">you</span>}
                </p>
                <p className="text-sm text-ink-2">
                  {f.members} travellers{f.children ? `, ${f.children} children` : ''}
                  {f.pace ? ` · ${f.pace} pace` : ''}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  {f.version ? `v${f.version}` : 'No plan'} · {formatMoney(f.cost)} · fit {f.fit != null ? `${Math.round(f.fit)}%` : '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 divide-x divide-rule border-t-2 border-ink text-center">
          <div className="p-3">
            <dt className="label">Shared by all</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{shared}</dd>
          </div>
          <div className="p-3">
            <dt className="label">Family branches</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{branch}</dd>
          </div>
        </dl>
        <p className="border-t border-rule px-4 py-3 text-xs text-ink-3">
          The optimizer builds one plan for everyone first. A stop appears as a branch when a family's plan differs from the others.
        </p>
      </section>

      <section className="min-w-0 lg:col-span-8" aria-label="Day by day">
        <div role="tablist" aria-label="Days" className="flex overflow-x-auto border border-rule bg-paper">
          {data.days.map((d) => (
            <button key={d.day} role="tab" aria-selected={d.day === day?.day} onClick={() => setPicked(d.day)} className={`shrink-0 border-r border-rule px-4 py-2 text-sm font-semibold ${d.day === day?.day ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-panel'}`}>
              Day {d.day}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto border border-rule bg-paper">
          <table className="ruled min-w-[34rem]">
            <thead>
              <tr>
                <th className="w-28">Time</th>
                <th>Stop</th>
                <th>Who goes</th>
              </tr>
            </thead>
            <tbody>
              {day?.stops.map((s) => (
                <tr key={s.location_id}>
                  <td className="whitespace-nowrap tabular-nums">
                    {s.start ?? '—'}
                    {s.end ? <span className="text-ink-3"> to {s.end}</span> : null}
                  </td>
                  <td className="font-semibold">
                    {s.name}
                    {s.meal && <span className="ml-2 text-xs font-normal text-ink-3">meal</span>}
                  </td>
                  <td>
                    {s.shared ? (
                      <Tag tone="ai">Everyone</Tag>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {s.families.map((fid) => (
                          <span key={fid} className="inline-flex items-center gap-1.5 border border-rule px-1.5 py-0.5 text-xs font-semibold">
                            <span aria-hidden className="h-2 w-2" style={{ background: colour(fid) }} />
                            {name(fid)}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
