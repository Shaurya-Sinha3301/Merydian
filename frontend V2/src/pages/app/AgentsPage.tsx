import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgentsOverview } from '../../hooks/usePhase3';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag, type Tone } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { timeAgo } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';
import type { AgentJobRow, AgentRoster } from '../../services/phase3';

const STATE: Record<AgentRoster['state'], { tone: Tone; label: string }> = {
  working: { tone: 'ai', label: 'Working' },
  failing: { tone: 'removed', label: 'Last run failed' },
  idle: { tone: 'added', label: 'Idle' },
  unused: { tone: 'neutral', label: 'Not used yet' },
};

const NAMES: Record<string, string> = { AGENT_FEEDBACK: 'Feedback agent', AGENT_TOOLS: 'Tools agent', AGENT_COMMUNICATION: 'Communication agent' };

function statusTone(s: string): Tone {
  if (s === 'COMPLETED') return 'added';
  if (s === 'FAILED' || s === 'CANCELLED') return 'removed';
  if (s === 'RUNNING' || s === 'RETRYING') return 'ai';
  return 'pending';
}

function Detail({ job }: { job: AgentJobRow }) {
  return (
    <div className="grid gap-4 border-t border-rule bg-panel px-4 py-4 text-sm md:grid-cols-3">
      <div>
        <p className="label">Message</p>
        <p className="mt-1">{job.message || 'No message. This job ran on an approval.'}</p>
      </div>
      <div>
        <p className="label">What the agent understood</p>
        {job.understood.length ? (
          <ul className="mt-1 list-disc pl-4">
            {job.understood.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-ink-3">Nothing recorded.</p>
        )}
      </div>
      <div>
        <p className="label">Decision</p>
        <p className="mt-1 font-semibold">{job.decision ? job.decision.replace(/_/g, ' ').toLowerCase() : '—'}</p>
        {job.reason && <p className="text-ink-2">{job.reason}</p>}
        {job.optimizer && <p className="mt-1 text-ink-3">Optimizer: {job.optimizer.toLowerCase()}</p>}
        {job.error && <p className="mt-2 border border-magenta bg-red-tint p-2 text-magenta">{job.error}</p>}
      </div>
    </div>
  );
}

export function AgentsPage() {
  useTitle('Agents');
  const { data, isLoading, error, dataUpdatedAt } = useAgentsOverview();
  const [filter, setFilter] = useState('ALL');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(15);

  if (isLoading) return <Loading label="Loading the agents" />;
  if (error || !data) return <ErrorNote>The agents could not be loaded.</ErrorNote>;

  const matching = data.recent.filter((j) => filter === 'ALL' || j.agent === filter);
  const rows = matching.slice(0, limit);
  const running = data.agents.reduce((n, a) => n + a.running, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Agents</h1>
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <span className={`inline-block h-2 w-2 ${running ? 'bg-cyan' : 'bg-green'}`} aria-hidden />
          {running ? `${running} running` : 'All quiet'} · refreshed {new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>
      <p className="mt-1 max-w-[72ch] text-ink-2">The AI agents behind the plans: what each one does, how reliably it runs, and the work it did most recently.</p>

      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {data.agents.map((a) => (
          <li key={a.id} className="flex flex-col border border-rule bg-paper">
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-4 py-2.5">
              <h2 className="title text-lg">{a.name}</h2>
              <Tag tone={STATE[a.state].tone}>{STATE[a.state].label}</Tag>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
              <p className="text-ink-2">{a.does}</p>
              <p className="text-xs text-ink-3">{a.uses}</p>
              <dl className="mt-auto grid grid-cols-4 gap-2 border-t border-rule pt-3 text-center">
                <div>
                  <dt className="label">Jobs</dt>
                  <dd className="text-lg font-bold tabular-nums">{a.total}</dd>
                </div>
                <div>
                  <dt className="label">Failed</dt>
                  <dd className={`text-lg font-bold tabular-nums ${a.failed ? 'text-magenta' : ''}`}>{a.failed}</dd>
                </div>
                <div>
                  <dt className="label">Retried</dt>
                  <dd className="text-lg font-bold tabular-nums">{a.retried}</dd>
                </div>
                <div>
                  <dt className="label">Avg</dt>
                  <dd className="text-lg font-bold tabular-nums">{a.avg_seconds != null ? `${Math.round(a.avg_seconds)}s` : '—'}</dd>
                </div>
              </dl>
              <p className="text-xs text-ink-3">{a.last_run ? `Last run ${timeAgo(a.last_run)}` : 'No runs yet'}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-6 border border-rule bg-paper" aria-labelledby="feed">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-2.5">
          <h2 id="feed" className="title text-lg">
            Live job feed
          </h2>
          <div className="flex divide-x divide-rule border border-rule text-sm" role="group" aria-label="Filter by agent">
            {[['ALL', 'All'], ...Object.entries(NAMES)].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`px-3 py-1.5 font-semibold ${filter === id ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="p-3">
            <Empty title="No jobs yet">Jobs appear here as the agents process traveller feedback and approvals.</Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ruled min-w-[44rem]">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>Trip</th>
                  <th>Decision</th>
                  <th className="num">Took</th>
                  <th className="num">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <>
                    <tr key={j.job_id} className="cursor-pointer" onClick={() => setOpen(open === j.job_id ? null : j.job_id)}>
                      <td className="whitespace-nowrap">
                        <Tag tone={statusTone(j.status)}>{j.status.toLowerCase()}</Tag>
                        {(j.attempts ?? 1) > 1 && <span className="ml-1.5 text-xs text-ink-3">{j.attempts} tries</span>}
                      </td>
                      <td className="whitespace-nowrap font-semibold">{NAMES[j.agent] ?? j.agent}</td>
                      <td>
                        {j.trip_id ? (
                          <Link to={tripPath(j.trip_id)} onClick={(e) => e.stopPropagation()} className="underline underline-offset-4 decoration-1 hover:decoration-2">
                            {j.trip_name || j.trip_id}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="max-w-[18rem] truncate text-ink-2">{j.decision ? j.decision.replace(/_/g, ' ').toLowerCase() : '—'}</td>
                      <td className="num">{j.duration_s != null ? `${Math.round(j.duration_s)} s` : '—'}</td>
                      <td className="num whitespace-nowrap text-ink-3">{timeAgo(j.created_at)}</td>
                    </tr>
                    {open === j.job_id && (
                      <tr key={`${j.job_id}-d`}>
                        <td colSpan={6} className="!p-0">
                          <Detail job={j} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {matching.length > rows.length && (
          <div className="border-t border-rule px-4 py-3">
            <button type="button" onClick={() => setLimit((l) => l + 15)} className="text-sm font-semibold underline underline-offset-4">
              Show {Math.min(15, matching.length - rows.length)} more of {matching.length - rows.length}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
