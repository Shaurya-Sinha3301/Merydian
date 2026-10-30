import type { TripDetailResponse } from '../types/dto/trip';

export const CURRENCY = '₹';

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${CURRENCY}${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatSignedMoney(value: number | null | undefined): string {
  if (value == null || value === 0) return `${CURRENCY}0`;
  return `${value > 0 ? '+' : '−'}${CURRENCY}${Math.abs(Math.round(value)).toLocaleString('en-IN')}`;
}

/** Itinerary times arrive as "HH:MM" strings. */
export function formatClock(value?: string | null): string {
  return value ? value.slice(0, 5) : 'TBD';
}

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'Dates to be confirmed';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${new Date(start).toLocaleDateString('en-US', opts)} – ${new Date(end).toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

/** The API sends UTC timestamps without a zone suffix; read them as UTC. */
function parseUtc(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((Date.now() - parseUtc(iso).getTime()) / 1000));
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Satisfaction is stored on a 0–10 scale. */
export function satisfactionPercent(trip: Pick<TripDetailResponse, 'total_satisfaction'>): number {
  return trip.total_satisfaction != null ? Math.round(trip.total_satisfaction * 10) : 0;
}
