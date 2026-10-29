import { Link } from 'react-router-dom';
import { useAgentJobs } from '../../hooks/useAgentJobs';
import { useTrips } from '../../hooks/useTrips';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag, type Tone } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { timeAgo } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';
import type { AgentJobDTO } from '../../types/dto/agent';

const TYPE: Record<string, string> = {
  AGENT_FEEDBACK: 'Feedback agent',
  AGENT_TOOLS: 'Tools agent',
  AGENT_COMMUNICATION: 'Communication agent',
};

function toneOf(status: string): Tone {
  if (status === 'COMPLETED') return 'added';
  if (status === 'FAILED' || status === 'CANCELLED') return 'removed';
  if (status === 'RUNNING' || status === 'RETRYING') return 'ai';
  return 'pending';
}

export function ActivityPage() {
  useTitle('Activity');
  const jobs = useAgentJobs(100, 0);
  const trips = useTrips(100, 0);
  const list: AgentJobDTO[] = jobs.data?.jobs ?? [];
  const name = (id?: string | null) => trips.data?.items.find((t) => t.trip_id === id)?.trip_name || id || 'Trip';

  const failed = list.filter((j) => j.status === 'FAILED').length;
  const retried = list.filter((j) => (j.attempt_count ?? 1) > 1).length;

  return (
    <div>
      <h1 className="display text-[2.8rem] sm:text-[4.2rem]">What the agents did.</h1>
      <p className="mt-3 max-w-[64ch] text-lg text-ink-2">
        {list.length} jobs{retried ? `, ${retried} needed a retry` : ''}
        {failed ? `, ${failed} failed` : ', none failed'}.
      </p>

      <div className="mt-10">
        {jobs.isLoading && <Loading label="Loading activity" />}
        {jobs.error && <ErrorNote>Activity could not be loaded.</ErrorNote>}
        {!jobs.isLoading && list.length === 0 && (
          <Empty title="No agent activity yet">Jobs appear here as the agents process traveller requests.</Empty>
        )}
        <ol className="border-t-4 border-ink">
          {list.map((j) => {
            const summary = typeof j.result?.summary === 'string' ? j.result.summary : j.error;
            return (
              <li key={j.job_id} className="grid gap-x-6 gap-y-1 border-b border-rule py-3 sm:grid-cols-[12rem_1fr_auto]">
                <div className="flex items-center gap-2">
                  <Tag tone={toneOf(j.status)}>{j.status.toLowerCase()}</Tag>
                  {(j.attempt_count ?? 1) > 1 && <Tag tone="pending">{j.attempt_count} attempts</Tag>}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold">
                    {TYPE[j.job_type ?? ''] ?? 'Agent job'}
                    {j.trip_id && (
                      <>
                        {', '}
                        <Link to={tripPath(j.trip_id)} className="underline underline-offset-4 decoration-2 hover:decoration-cyan">
                          {name(j.trip_id)}
                        </Link>
                      </>
                    )}
                  </p>
                  {summary && <p className="mt-0.5 max-w-[70ch] text-sm text-ink-2">{summary}</p>}
                </div>
                <p className="text-sm text-ink-3 sm:text-right">{timeAgo(j.completed_at ?? j.updated_at)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
