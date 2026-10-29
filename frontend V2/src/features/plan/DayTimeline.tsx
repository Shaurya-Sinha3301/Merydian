import { MapPin, Utensils } from 'lucide-react';
import { clockLabel, durationLabel, type Stop } from '../../lib/plan';
import { photoForStop } from '../../lib/photos';
import { Photo } from '../../ui/Photo';
import { Tag, type Tone } from '../../ui/Tag';

export interface TimelineStop extends Stop {
  tone?: Tone;
  /** Position in the day, matching the number on the map. */
  n?: number;
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 border-paper bg-ink text-xs font-extrabold text-paper">
      {n}
    </span>
  );
}

function Thumb({ stop }: { stop: TimelineStop }) {
  const photo = photoForStop(stop.id) ?? photoForStop(stop.title);
  if (photo)
    return (
      <Photo photo={photo} alt="" className="h-16 w-24 shrink-0 rounded-xl">
        <Badge n={stop.n} />
      </Photo>
    );
  const Icon = stop.category === 'meal' ? Utensils : MapPin;
  const bg =
    stop.tone === 'added' ? 'bg-green text-ink' : stop.tone === 'removed' ? 'bg-magenta text-paper' : stop.category === 'meal' ? 'bg-ink text-paper' : 'bg-cyan text-ink';
  return (
    <div className={`relative flex h-16 w-24 shrink-0 items-center justify-center rounded-xl ${bg}`}>
      <Badge n={stop.n} />
      <Icon aria-hidden size={24} strokeWidth={2.2} />
    </div>
  );
}

interface DayTimelineProps {
  stops: TimelineStop[];
  lo: number;
  hi: number;
}

/** One day as a timeline: a photo, the time and name, and where the stop sits in the day. */
export function DayTimeline({ stops, lo, hi }: DayTimelineProps) {
  const span = hi - lo;
  return (
    <ol className="flex flex-col gap-2">
      {stops.map((s, i) => {
        const left = ((s.start - lo) / span) * 100;
        const width = Math.max(((s.end - s.start) / span) * 100, 2);
        const gone = s.tone === 'removed';
        const bar = s.tone === 'added' ? 'bg-green' : gone ? 'bg-magenta' : s.category === 'meal' ? 'bg-ink' : 'bg-cyan';
        return (
          <li
            key={`${s.id}-${i}-${gone}`}
            className="snap-in flex items-center gap-3 rounded-2xl bg-paper p-2 shadow-[var(--shadow-card)]"
            style={{ ['--i' as string]: i }}
          >
            <Thumb stop={s} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tabular-nums text-ink-3">
                {clockLabel(s.start)} to {clockLabel(s.end)} · {durationLabel(s.end - s.start)}
                {s.category === 'meal' ? ' · meal' : ''}
              </p>
              <p className={`text-base font-extrabold leading-snug sm:text-lg ${gone ? 'line-through decoration-2' : ''}`}>
                {s.title}
              </p>
              <div className="mt-2 hidden h-2 rounded-full bg-panel sm:block" aria-hidden>
                <div className={`h-2 rounded-full ${bar}`} style={{ marginLeft: `${left}%`, width: `${width}%` }} />
              </div>
            </div>
            <div className="shrink-0 pr-1">
              {s.tone === 'added' && <Tag tone="added">New</Tag>}
              {gone && <Tag tone="removed">Dropped</Tag>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
