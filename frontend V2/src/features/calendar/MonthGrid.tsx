import { useMemo } from 'react';
import type { Tone } from '../../ui/Tag';

export interface CalendarEvent {
  id: string;
  label: string;
  start: Date;
  end: Date;
  tone?: Tone;
  onPick?: () => void;
}

interface MonthGridProps {
  year: number;
  /** 0-based month. */
  month: number;
  events: CalendarEvent[];
  className?: string;
  compact?: boolean;
}

const DAY = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BAR: Record<Tone, string> = {
  added: 'bg-green text-paper',
  removed: 'bg-magenta text-paper',
  shifted: 'bg-yellow text-paper',
  pending: 'bg-yellow text-paper',
  ai: 'bg-cyan text-paper',
  neutral: 'bg-ink text-paper',
};

function midnight(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** A month as a printed calendar: Monday-first weeks, trips drawn as bars across their days. */
export function MonthGrid({ year, month, events, className = '', compact = false }: MonthGridProps) {
  const weeks = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const startMs = first.getTime() - offset * DAY;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const count = Math.ceil((offset + days) / 7);
    return Array.from({ length: count }, (_, w) => startMs + w * 7 * DAY);
  }, [year, month]);

  const todayMs = midnight(new Date());
  const rowH = compact ? 'min-h-[3.1rem]' : 'min-h-[6.5rem]';

  return (
    <div className={`border border-rule bg-paper ${className}`}>
      <div className="grid grid-cols-7 border-b-2 border-ink">
        {WEEKDAYS.map((d) => (
          <p key={d} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            {d}
          </p>
        ))}
      </div>
      {weeks.map((weekStart) => {
        const weekEnd = weekStart + 6 * DAY;
        const segs = events
          .map((e) => ({ e, s: midnight(e.start), f: midnight(e.end) }))
          .filter((x) => x.s <= weekEnd && x.f >= weekStart)
          .sort((a, b) => a.s - b.s);
        const lanes: number[] = [];
        const placed = segs.map((x) => {
          const from = Math.max(x.s, weekStart);
          const lane = lanes.findIndex((end) => end < from);
          const l = lane === -1 ? lanes.length : lane;
          lanes[l] = Math.min(x.f, weekEnd);
          return { ...x, col: Math.round((from - weekStart) / DAY) + 1, span: Math.round((Math.min(x.f, weekEnd) - from) / DAY) + 1, lane: l };
        });
        return (
          <div
            key={weekStart}
            className={`relative grid grid-cols-7 border-b border-rule last:border-b-0 ${rowH}`}
            style={{
              backgroundImage: 'linear-gradient(to right, var(--color-rule) 1px, transparent 1px)',
              backgroundSize: 'calc(100% / 7) 100%',
            }}
          >
            {Array.from({ length: 7 }, (_, i) => {
              const ms = weekStart + i * DAY;
              const d = new Date(ms);
              const outside = d.getUTCMonth() !== month;
              const today = ms === todayMs;
              return (
                <p
                  key={i}
                  className={`px-2 pt-1 text-xs font-semibold tabular-nums ${outside ? 'text-ink-3/60' : 'text-ink-2'}`}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                >
                  <span className={today ? 'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-paper' : ''}>
                    {d.getUTCDate()}
                  </span>
                </p>
              );
            })}
            {placed.map(({ e, col, span, lane }) => {
              const cls = `mx-0.5 mb-0.5 truncate px-1.5 py-0.5 text-left text-[11px] font-semibold ${BAR[e.tone ?? 'ai']}`;
              const style = { gridColumn: `${col} / span ${span}`, gridRow: lane + 2 };
              return e.onPick ? (
                <button key={e.id + weekStart} type="button" onClick={e.onPick} className={`${cls} hover:opacity-85`} style={style}>
                  {e.label}
                </button>
              ) : (
                <p key={e.id + weekStart} className={cls} style={style}>
                  {e.label}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
