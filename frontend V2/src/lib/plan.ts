import type { TimelineDTO } from '../types/dto/timeline';

export interface Stop {
  id: string;
  title: string;
  start: number; // minutes from midnight
  end: number;
  category: 'meal' | 'activity';
  note?: string | null;
}

export interface PlanDay {
  day: number;
  stops: Stop[];
}

export function toMinutes(clock?: string | null): number | null {
  if (!clock) return null;
  const [h, m] = clock.split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

export function clockLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function durationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function toPlan(timeline?: TimelineDTO): PlanDay[] {
  return (timeline?.days ?? []).map((d) => ({
    day: d.day,
    stops: d.activities.map((a) => {
      const start = toMinutes(a.start_time) ?? 9 * 60;
      const end = toMinutes(a.end_time) ?? start + (a.duration_min || 60);
      return {
        id: a.id,
        title: a.title,
        start,
        end: Math.max(end, start + 15),
        category: (a.category || '').toLowerCase() === 'meal' ? 'meal' : 'activity',
        note: a.notes,
      } as Stop;
    }),
  }));
}

/** Hour range that fits every day, padded to whole hours. */
export function planRange(days: PlanDay[]): [number, number] {
  const all = days.flatMap((d) => d.stops);
  if (all.length === 0) return [9 * 60, 19 * 60];
  const lo = Math.floor(Math.min(...all.map((s) => s.start)) / 60) * 60;
  const hi = Math.ceil(Math.max(...all.map((s) => s.end)) / 60) * 60;
  return [Math.min(lo, 9 * 60), Math.max(hi, 18 * 60)];
}
