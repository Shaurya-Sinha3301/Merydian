import { useMemo, useState } from 'react';
import { useTrips } from '../../hooks/useTrips';
import { useAgentJobs } from '../../hooks/useAgentJobs';
import { useDecisions } from '../../hooks/useDecisions';
import type { CalendarEvent } from '../calendar/MonthGrid';
import type { TripDetailResponse } from '../../types/dto/trip';
import type { AgentJobDTO } from '../../types/dto/agent';
import { tripPath } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';

/** "2026-03-15" as a local date, so a trip's first day lands on the right calendar cell. */
export function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

/** Everything the agent's pages derive from the trips and agent jobs, in one place. */
export function useFleet() {
  const trips = useTrips(100, 0);
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const jobs = useAgentJobs(100, 0, isAgent);
  const items: TripDetailResponse[] = trips.data?.items ?? [];
  const jobList: AgentJobDTO[] = jobs.data?.jobs ?? [];

  const decisions = useDecisions(isAgent);
  const pending = (decisions.data ?? []).filter((d) => d.status === 'pending');
  const waitingTrips = new Set(pending.map((d) => d.trip_id));

  const totalValue = items.reduce((n, t) => n + (t.total_cost ?? 0), 0);
  const rounds = items.reduce((n, t) => n + (t.feedback_count ?? 0), 0);
  const fits = items.map((t) => t.total_satisfaction).filter((v): v is number => v != null);
  const avgFit = fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : null;
  const failed = jobList.filter((j) => j.status === 'FAILED').length;

  const nameOf = (id?: string | null) => items.find((t) => t.trip_id === id)?.trip_name || id || 'Trip';

  return {
    trips,
    jobs,
    items,
    jobList,
    decisions,
    pending,
    waitingTrips,
    stats: { totalValue, rounds, avgFit, failed },
    nameOf,
    isLoading: trips.isLoading || (isAgent && jobs.isLoading),
    error: trips.error || (isAgent ? jobs.error : null),
  };
}

/** Month cursor that starts on the month of the first trip. */
export function useMonthCursor(items: TripDetailResponse[]) {
  const first = useMemo(() => {
    const dates = items.map((t) => parseDay(t.start_date)).filter((d): d is Date => !!d);
    dates.sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? new Date();
  }, [items]);
  const [offset, setOffset] = useState(0);
  const at = new Date(first.getFullYear(), first.getMonth() + offset, 1);
  return {
    year: at.getFullYear(),
    month: at.getMonth(),
    label: at.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    prev: () => setOffset((o) => o - 1),
    next: () => setOffset((o) => o + 1),
  };
}

export function tripEvents(items: TripDetailResponse[], waiting: Set<string>, go?: (path: string) => void): CalendarEvent[] {
  return items.flatMap((t) => {
    const start = parseDay(t.start_date);
    const end = parseDay(t.end_date) ?? start;
    if (!start || !end) return [];
    return [
      {
        id: t.trip_id,
        label: t.trip_name || 'Trip',
        start,
        end,
        tone: waiting.has(t.trip_id) ? ('pending' as const) : ('ai' as const),
        onPick: go ? () => go(tripPath(t.trip_id)) : undefined,
      },
    ];
  });
}
