import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { timeAgo } from '../../lib/format';
import type { AgentJobDTO } from '../../types/dto/agent';

const TYPE_LABEL: Record<string, string> = {
  AGENT_FEEDBACK: 'Feedback agent',
  AGENT_TOOLS: 'Tools agent',
  AGENT_COMMUNICATION: 'Communication agent',
};

function statusVariant(status: string): 'approved' | 'failed' | 'running' | 'pending' {
  if (status === 'COMPLETED') return 'approved';
  if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
  if (status === 'RUNNING' || status === 'RETRYING') return 'running';
  return 'pending';
}

interface JobProgressCardProps {
  job: AgentJobDTO;
  tripName: string;
  onView?: () => void;
}

export function JobProgressCard({ job, tripName, onView }: JobProgressCardProps) {
  const summary = typeof job.result?.summary === 'string' ? job.result.summary : job.error;
  const retried = (job.attempt_count ?? 1) > 1;

  return (
    <div className="flex items-start gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-medium">{TYPE_LABEL[job.job_type ?? ''] ?? 'Agent job'}</span>
          <Badge variant={statusVariant(job.status)}>{job.status.toLowerCase()}</Badge>
          {retried && <Badge variant="pending">{job.attempt_count} attempts</Badge>}
        </div>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {tripName} · {timeAgo(job.completed_at ?? job.updated_at)}
        </p>
        {summary && <p className="text-xs mt-1 leading-snug">{summary}</p>}
      </div>
      {onView && (
        <Button variant="ghost" size="sm" onClick={onView}>
          View trip
        </Button>
      )}
    </div>
  );
}
