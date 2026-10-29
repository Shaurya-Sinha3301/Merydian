import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { JobProgressCard } from '../optimization/JobProgressCard';
import { ApprovalCard } from '../explainability/ApprovalCard';
import { useAgentJobs } from '../../hooks/useAgentJobs';
import { useTrips } from '../../hooks/useTrips';
import { useTripStore } from '../../stores/trip.store';
import { formatMoney } from '../../lib/format';
import type { AgentJobDTO } from '../../types/dto/agent';

interface AgentDashboardProps {
  onNavigate: (page: string) => void;
}

export function AgentDashboard({ onNavigate }: AgentDashboardProps) {
  const { data, isLoading } = useAgentJobs(100, 0);
  const { data: tripsData } = useTrips(100, 0);
  const setCurrentTripId = useTripStore((s) => s.setCurrentTripId);

  const jobs: AgentJobDTO[] = data?.jobs ?? [];
  const trips = tripsData?.items ?? [];
  const tripName = (id?: string | null) => trips.find((t) => t.trip_id === id)?.trip_name || id || 'Unknown trip';

  const awaiting = jobs.filter((j) => j.result?.awaiting_approval === true && typeof j.result?.event_id === 'string');
  const running = jobs.filter((j) => j.status === 'RUNNING' || j.status === 'QUEUED' || j.status === 'RETRYING').length;
  const failed = jobs.filter((j) => j.status === 'FAILED').length;
  const retried = jobs.filter((j) => (j.attempt_count ?? 1) > 1).length;

  const openTrip = (id?: string | null) => {
    if (!id) return;
    setCurrentTripId(id);
    onNavigate(`/trip-overview/${id}`);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Agent dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {today} · {awaiting.length} awaiting your decision
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Awaiting approval" value={awaiting.length} trend="neutral" />
        <MetricCard label="Running or queued" value={running} trend="neutral" />
        <MetricCard label="Retried" value={retried} trend="neutral" />
        <MetricCard label="Failed" value={failed} trend="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Needs your decision
          </h2>
          {awaiting.length === 0 && !isLoading && (
            <Card padding="md">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Nothing is waiting on you. When a traveller makes a request, the AI prepares options and they appear here.
              </p>
            </Card>
          )}
          {awaiting.map((job) => (
            <ApprovalCard
              key={job.job_id}
              eventId={String(job.result?.event_id)}
              tripName={tripName(job.trip_id)}
              request={typeof job.result?.summary === 'string' ? job.result.summary : undefined}
              onViewTrip={() => openTrip(job.trip_id)}
            />
          ))}

          <h2 className="text-sm font-semibold pt-4" style={{ fontFamily: 'var(--font-display)' }}>
            Agent activity
          </h2>
          <Card padding="none">
            {isLoading ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading activity...</div>
            ) : jobs.length === 0 ? (
              <EmptyState title="No agent activity yet" description="Jobs appear here as the AI agents process traveller requests." />
            ) : (
              jobs.map((job) => (
                <JobProgressCard
                  key={job.job_id}
                  job={job}
                  tripName={tripName(job.trip_id)}
                  onView={() => openTrip(job.trip_id)}
                />
              ))
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Trips you oversee</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {trips.map((t, i) => (
                <button
                  key={t.trip_id}
                  type="button"
                  onClick={() => openTrip(t.trip_id)}
                  className="w-full text-left flex items-center gap-3 pb-3"
                  style={{ borderBottom: i < trips.length - 1 ? '1px solid var(--border)' : undefined }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.trip_name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                      {formatMoney(t.total_cost)} · v{t.current_version ?? 1} · {t.feedback_count ?? 0} feedback round{(t.feedback_count ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              ))}
              {trips.length === 0 && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No trips yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
