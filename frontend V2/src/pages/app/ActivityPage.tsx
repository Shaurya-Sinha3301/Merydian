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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Agent activity</h1>
        <p className="text-sm text-ink-3">
          {list.length} jobs{retried ? `, ${retried} needed a retry` : ''}
          {failed ? `, ${failed} failed` : ', none failed'}
        </p>
      </div>

      <div className="mt-4">
        {jobs.isLoading && <Loading label="Loading activity" />}
        {jobs.error && <ErrorNote>Activity could not be loaded.</ErrorNote>}
        {!jobs.isLoading && list.length === 0 && (
          <Empty title="No agent activity yet">Jobs appear here as the agents process traveller requests.</Empty>
        )}
        {list.length > 0 && (
          <div className="overflow-x-auto border border-rule bg-paper">
            <table className="ruled min-w-[44rem]">
              <caption className="sr-only">Agent jobs</caption>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>Trip</th>
                  <th>Result</th>
                  <th className="num">When</th>
                </tr>
              </thead>
              <tbody>
                {list.map((j) => {
                  const summary = typeof j.result?.summary === 'string' ? j.result.summary : j.error;
                  return (
                    <tr key={j.job_id}>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Tag tone={toneOf(j.status)}>{j.status.toLowerCase()}</Tag>
                          {(j.attempt_count ?? 1) > 1 && <Tag tone="pending">{j.attempt_count} attempts</Tag>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-semibold">{TYPE[j.job_type ?? ''] ?? 'Agent job'}</td>
                      <td>
                        {j.trip_id && (
                          <Link to={tripPath(j.trip_id)} className="underline underline-offset-4 decoration-1 hover:decoration-2">
                            {name(j.trip_id)}
                          </Link>
                        )}
                      </td>
                      <td className="max-w-[28rem] truncate text-ink-2">{summary}</td>
                      <td className="num whitespace-nowrap text-ink-3">{timeAgo(j.completed_at ?? j.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
