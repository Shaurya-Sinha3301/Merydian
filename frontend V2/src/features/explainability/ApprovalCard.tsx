import { Card, CardHeader, CardTitle, CardMeta } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAgentOptions, useApproveOption } from '../../hooks/useAgentJobs';
import { formatMoney } from '../../lib/format';

interface ApprovalCardProps {
  eventId: string;
  tripName: string;
  /** What the traveller asked for, if known. */
  request?: string;
  onViewTrip?: () => void;
}

const STATUS_VARIANT = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'failed' } as const;

export function ApprovalCard({ eventId, tripName, request, onViewTrip }: ApprovalCardProps) {
  const { data, isLoading, error } = useAgentOptions(eventId);
  const approve = useApproveOption();
  const options = data?.options ?? [];
  const decided = options.some((o) => o.status !== 'PENDING');

  return (
    <Card ai padding="md">
      <CardHeader>
        <div>
          <CardTitle>{tripName}</CardTitle>
          {request && <CardMeta className="mt-0.5">{request}</CardMeta>}
        </div>
        <Badge variant={decided ? 'approved' : 'review'}>{decided ? 'Decided' : 'Needs your decision'}</Badge>
      </CardHeader>

      {isLoading && <p className="text-sm">Loading options...</p>}
      {error && <p className="text-sm text-red-500">Could not load the options for this request.</p>}

      <div className="space-y-3">
        {options.map((o) => (
          <div
            key={o.option_id}
            className="rounded-lg p-4"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{o.summary}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
                  Plan cost {formatMoney(o.cost)} · predicted fit {Math.round(o.satisfaction * 100)}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[o.status] ?? 'default'}>{o.status.toLowerCase()}</Badge>
                {o.status === 'PENDING' && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={approve.isPending && approve.variables === o.option_id}
                    onClick={() => approve.mutate(o.option_id)}
                  >
                    Approve
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {approve.isError && (
        <p className="text-xs text-red-500 mt-3">Approval failed. Please try again.</p>
      )}
      {approve.isSuccess && (
        <p className="text-xs mt-3" style={{ color: 'var(--success)' }}>
          Approved. The tools and communication agents have been queued.
        </p>
      )}
      {onViewTrip && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={onViewTrip}>View trip →</Button>
        </div>
      )}
    </Card>
  );
}
