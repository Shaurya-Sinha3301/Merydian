import type { TimelineActivity as ITimelineActivity } from '../../lib/types';

interface TimelineActivityProps {
  activity: ITimelineActivity;
  onExpand?: () => void;
  expanded?: boolean;
}

const typeConfig = {
  transport: {
    label: 'Transport',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 5.5h12M4 10.5h8M3 2.5h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="5" cy="13" r="1" fill="currentColor" />
        <circle cx="11" cy="13" r="1" fill="currentColor" />
      </svg>
    ),
    color: 'var(--primary)',
  },
  hotel: {
    label: 'Hotel',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 8h12M7 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'var(--ai)',
  },
  meal: {
    label: 'Meal',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M5 2v5a3 3 0 006 0V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 9v5M5 2v2M8 2v2M11 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'var(--success)',
  },
  activity: {
    label: 'Activity',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 9v5M5.5 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: 'var(--warning)',
  },
};

export function TimelineActivity({ activity, onExpand, expanded = false }: TimelineActivityProps) {
  const config = typeConfig[activity.type];

  return (
    <div
      className="flex gap-4 group cursor-pointer"
      onClick={onExpand}
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `color-mix(in srgb, ${config.color} 12%, var(--card))`, color: config.color, border: `1px solid color-mix(in srgb, ${config.color} 20%, var(--border))` }}
        >
          {config.icon}
        </div>
        <div className="w-px flex-1 mt-2" style={{ backgroundColor: 'var(--border)' }} />
      </div>

      {/* Content */}
      <div
        className="flex-1 mb-4 rounded-lg p-4 transition-colors duration-150"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--muted-foreground)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
            <p className="text-sm font-semibold">{activity.title}</p>
            {activity.provider && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {activity.provider}
                {activity.location && ` · ${activity.location}`}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
              {activity.startTime} – {activity.endTime}
            </p>
            {activity.cost != null && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
                {activity.currency ?? '€'}{activity.cost.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {activity.warnings && activity.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {activity.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--warning) 10%, transparent)`,
                  color: 'var(--warning)',
                  border: `1px solid color-mix(in srgb, var(--warning) 20%, transparent)`,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14.5 13.5H1.5L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M8 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
                </svg>
                {w}
              </div>
            ))}
          </div>
        )}

        {expanded && activity.notes && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{activity.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
