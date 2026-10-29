import { Button } from '../../components/ui/Button';
import type { DiffChange } from '../../lib/types';

interface DiffCardProps {
  change: DiffChange;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions?: boolean;
}

export function DiffCard({ change, onApprove, onReject, showActions = false }: DiffCardProps) {
  const costDelta = change.impact.costDelta;
  const timeDelta = change.impact.timeDelta;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Previous Plan */}
      <div className="p-4" style={{ backgroundColor: `color-mix(in srgb, var(--error) 4%, var(--card))`, borderBottom: '1px solid var(--border)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
          Previous
        </p>
        <p className="text-sm font-medium">{change.previousValue}</p>
      </div>

      {/* Reason */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>
          <path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-xs" style={{ color: 'var(--foreground)' }}>
          <span className="font-semibold">Reason: </span>{change.reason}
        </p>
      </div>

      {/* Updated Plan */}
      <div className="p-4" style={{ backgroundColor: `color-mix(in srgb, var(--success) 4%, var(--card))`, borderBottom: '1px solid var(--border)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
          Updated
        </p>
        <p className="text-sm font-medium">{change.updatedValue}</p>
      </div>

      {/* Impact + Tags */}
      <div className="p-4" style={{ borderBottom: showActions ? '1px solid var(--border)' : undefined }}>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {costDelta != null && (
            <span
              className="text-xs px-2 py-0.5 rounded font-mono font-medium"
              style={{
                backgroundColor: costDelta < 0 ? `color-mix(in srgb, var(--success) 12%, transparent)` : `color-mix(in srgb, var(--error) 12%, transparent)`,
                color: costDelta < 0 ? 'var(--success)' : 'var(--error)',
              }}
            >
              {costDelta < 0 ? '' : '+'}{change.impact.currency ?? '₹'}{Math.abs(costDelta)}
            </span>
          )}
          {timeDelta != null && (
            <span
              className="text-xs px-2 py-0.5 rounded font-mono font-medium"
              style={{
                backgroundColor: timeDelta > 0 ? `color-mix(in srgb, var(--success) 12%, transparent)` : `color-mix(in srgb, var(--error) 12%, transparent)`,
                color: timeDelta > 0 ? 'var(--success)' : 'var(--error)',
              }}
            >
              {timeDelta > 0 ? '+' : ''}{timeDelta}m
            </span>
          )}
          {change.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {showActions && (
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--muted)' }}>
          <Button variant="primary" size="sm" onClick={() => onApprove?.(change.id)}>
            Approve this change
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onReject?.(change.id)}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
