import { DiffCard } from './DiffCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useDiff } from '../../hooks/useDiff';
import { useExplainability } from '../../hooks/useExplainability';
import { useCurrentTrip } from '../../hooks/useCurrentTrip';
import { formatSignedMoney } from '../../lib/format';
import type { DiffChange } from '../../lib/types';
import type { DiffItemDTO } from '../../types/dto/diff';

interface DiffViewerProps {
  onNavigate: (page: string) => void;
}

function poiName(value: unknown): string | undefined {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return (v.name || v.title || v.poi_id) as string | undefined;
  }
  return undefined;
}

function poiWindow(value: unknown): string {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (v.time_window_start) return `${String(v.time_window_start).slice(0, 5)}–${String(v.time_window_end ?? '').slice(0, 5)}`;
  }
  return '';
}

export function DiffViewer({ onNavigate }: DiffViewerProps) {
  const { tripId, name, familyId, currentVersion, previousVersion, isLoading: tripLoading } = useCurrentTrip();
  const { data: diff, isLoading, error } = useDiff(familyId, previousVersion, currentVersion);
  const { data: explanations } = useExplainability('', familyId);

  // Reasons come from the explanation rows stored for the same POI
  const reasonFor = (poi?: string): string | undefined =>
    poi ? explanations?.find((e) => e.activity_changed === poi)?.human_explanation : undefined;
  const tagsFor = (poi?: string): string[] =>
    poi ? explanations?.find((e) => e.activity_changed === poi)?.affected_constraints ?? [] : [];

  const changes: DiffChange[] = [];
  let counter = 1;
  const push = (items: DiffItemDTO[] | undefined, field: string, label: (i: DiffItemDTO) => [string, string]) => {
    (items ?? []).forEach((item) => {
      const poi = poiName(item.after) ?? poiName(item.before);
      const [previousValue, updatedValue] = label(item);
      changes.push({
        id: `diff-${counter++}`,
        type: 'activity',
        field,
        previousValue,
        updatedValue,
        reason: field === 'time_changed' ? 'Shifted because the stops before it changed' : (reasonFor(poi) ?? item.reason ?? 'Adjusted to fit the updated plan'),
        impact: {},
        tags: tagsFor(poi),
      });
    });
  };
  push(diff?.removed_activities, 'removed', (i) => [`${poiName(i.before) ?? 'Stop'} ${poiWindow(i.before)}`.trim(), 'Removed from the plan']);
  push(diff?.added_activities, 'added', (i) => ['Not in the previous plan', `${poiName(i.after) ?? 'Stop'} ${poiWindow(i.after)}`.trim()]);
  push(diff?.time_changes, 'time_changed', (i) => [
    `${poiName(i.before) ?? 'Stop'} ${poiWindow(i.before)}`.trim(),
    `${poiName(i.after) ?? 'Stop'} ${poiWindow(i.after)}`.trim(),
  ]);

  if (tripLoading || isLoading) return <div className="p-8 text-center">Loading changes...</div>;

  if (!tripId) {
    return (
      <EmptyState
        title="Pick a trip first"
        description="Open a trip from your dashboard to review how its itinerary changed."
        action={{ label: 'Go to dashboard', onClick: () => onNavigate('customer-dashboard') }}
      />
    );
  }

  if (previousVersion === undefined || error) {
    return (
      <EmptyState
        title="Nothing to compare yet"
        description="This trip has only one itinerary version. Submit feedback and the re-optimized plan will show up here."
        action={{ label: 'Give feedback', onClick: () => onNavigate('feedback') }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Change review
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {name} · version {previousVersion} → {currentVersion} · {changes.length} change{changes.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={() => onNavigate('explainability')}>
            Why these changes?
          </Button>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 rounded-lg mt-4"
          style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <div className="text-xs">
            <span style={{ color: 'var(--muted-foreground)' }}>Plan cost: </span>
            <span
              className="font-mono font-semibold"
              style={{ color: (diff?.cost_delta ?? 0) <= 0 ? 'var(--success)' : 'var(--error)' }}
            >
              {formatSignedMoney(diff?.cost_delta)}
            </span>
          </div>
          {diff?.satisfaction_delta != null && (
            <div className="text-xs">
              <span style={{ color: 'var(--muted-foreground)' }}>Fit score: </span>
              <span className="font-mono font-semibold">
                {diff.satisfaction_delta >= 0 ? '+' : ''}
                {diff.satisfaction_delta.toFixed(2)}
              </span>
            </div>
          )}
          {diff?.summary && (
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{diff.summary}</div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {changes.map((change) => (
          <DiffCard key={change.id} change={change} />
        ))}
        {changes.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            The two versions are identical.
          </p>
        )}
      </div>
    </div>
  );
}
