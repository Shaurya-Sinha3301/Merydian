import { Card, CardHeader, CardTitle, CardMeta } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useExplainability } from '../../hooks/useExplainability';
import { useCurrentTrip } from '../../hooks/useCurrentTrip';
import { formatSignedMoney } from '../../lib/format';
import type { ExplanationDTO } from '../../types/dto/explainability';

interface ExplainabilityPanelProps {
  onNavigate: (page: string) => void;
}

const CHANGE_LABEL: Record<string, { text: string; variant: 'approved' | 'failed' | 'default' }> = {
  POI_ADDED: { text: 'Added', variant: 'approved' },
  POI_REMOVED: { text: 'Removed', variant: 'failed' },
  ROUTE_CHANGED: { text: 'Route changed', variant: 'default' },
};

function prettyTag(tag: string): string {
  return tag.toLowerCase().replace(/_/g, ' ');
}

export function ExplainabilityPanel({ onNavigate }: ExplainabilityPanelProps) {
  const { tripId, name, familyId } = useCurrentTrip();
  const { data: explanations, isLoading } = useExplainability('', familyId);

  if (isLoading) return <div className="p-8 text-center">Loading explanations...</div>;

  if (!tripId || !explanations || explanations.length === 0) {
    return (
      <EmptyState
        title="No AI changes to explain yet"
        description="When feedback changes your itinerary, each change is explained here with the reason behind it."
        action={{ label: 'Give feedback', onClick: () => onNavigate('feedback') }}
      />
    );
  }

  // Group by the feedback that triggered the change
  const groups = new Map<string, ExplanationDTO[]>();
  explanations.forEach((e) => {
    const key = e.trigger_message || 'Automatic re-optimization';
    groups.set(key, [...(groups.get(key) ?? []), e]);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Why the plan changed
          </h1>
          <Badge variant="ai">AI-generated</Badge>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {name} · {explanations.length} explained change{explanations.length === 1 ? '' : 's'}
        </p>
      </div>

      {[...groups.entries()].map(([message, items]) => (
        <Card key={message} ai padding="md">
          <CardHeader>
            <div>
              <CardTitle>You asked</CardTitle>
              <CardMeta className="mt-0.5">“{message}”</CardMeta>
            </div>
          </CardHeader>

          {(() => {
            const counts = new Map<string, number>();
            items.forEach((e) => counts.set(e.human_explanation, (counts.get(e.human_explanation) ?? 0) + 1));
            const shared = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
            return shared && shared[1] > 1 ? (
              <p className="text-sm leading-relaxed mb-5">{shared[0]}</p>
            ) : null;
          })()}

          <ul className="space-y-5">
            {items.map((e) => {
              const repeated = items.filter((x) => x.human_explanation === e.human_explanation).length > 1;
              const label = CHANGE_LABEL[e.change_type ?? ''] ?? { text: 'Changed', variant: 'default' as const };
              const cost = e.cost_delta?.extra_cost ?? (e.cost_delta?.saved_cost != null ? -e.cost_delta.saved_cost : undefined);
              return (
                <li key={e.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={label.variant}>{label.text}</Badge>
                    <span className="text-sm font-semibold">{e.activity_changed}</span>
                    {e.day != null && (
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Day {e.day}</span>
                    )}
                    {cost != null && (
                      <span className="text-xs font-mono ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                        {formatSignedMoney(cost)}
                      </span>
                    )}
                  </div>
                  {!repeated && <p className="text-sm leading-relaxed">{e.human_explanation}</p>}
                  {e.affected_constraints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {e.affected_constraints.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                        >
                          {prettyTag(t)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => onNavigate('diff-viewer')}>
          See the side-by-side changes
        </Button>
        <Button variant="secondary" onClick={() => onNavigate('timeline')}>
          Back to timeline
        </Button>
      </div>
    </div>
  );
}
