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

function Thumb({ stop }: { stop: TimelineStop }) {
  const photo = photoForStop(stop.id) ?? photoForStop(stop.title);
  if (photo) return <Photo photo={photo} alt="" className="h-11 w-16 shrink-0" />;
  const Icon = stop.category === 'meal' ? Utensils : MapPin;
  return (
    <div className="flex h-11 w-16 shrink-0 items-center justify-center border border-rule bg-panel text-ink-3">
      <Icon aria-hidden size={18} strokeWidth={1.8} />
    </div>
  );
}

interface DayTimelineProps {
  stops: TimelineStop[];
  lo: number;
  hi: number;
}

/** One day as a ruled timetable: stop number, time, the stop with a small plate, its length and where it sits in the day. */
export function DayTimeline({ stops, lo, hi }: DayTimelineProps) {
  const span = hi - lo;
  return (
    <div className="overflow-x-auto border border-rule bg-paper">
      <table className="ruled min-w-[34rem]">
        <caption className="sr-only">Timetable for the day</caption>
        <thead>
          <tr>
            <th className="w-10">No.</th>
            <th className="w-32">Time</th>
            <th>Stop</th>
            <th className="w-24">Length</th>
            <th className="hidden w-40 sm:table-cell">In the day</th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {stops.map((s, i) => {
            const left = ((s.start - lo) / span) * 100;
            const width = Math.max(((s.end - s.start) / span) * 100, 3);
            const gone = s.tone === 'removed';
            const bar = s.tone === 'added' ? 'bg-green' : gone ? 'bg-magenta' : 'bg-cyan';
            return (
              <tr key={`${s.id}-${i}-${gone}`} className={gone ? 'text-ink-3' : ''}>
                <td className="font-semibold tabular-nums">{gone ? '×' : s.n}</td>
                <td className="whitespace-nowrap tabular-nums">
                  {clockLabel(s.start)}
                  <span className="text-ink-3"> to {clockLabel(s.end)}</span>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Thumb stop={s} />
                    <span className={`font-semibold ${gone ? 'line-through decoration-magenta decoration-2' : ''}`}>
                      {s.title}
                      {s.category === 'meal' && <span className="ml-2 text-xs font-normal text-ink-3">meal</span>}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap text-ink-2">{durationLabel(s.end - s.start)}</td>
                <td className="hidden sm:table-cell">
                  <div className="h-2 bg-panel" aria-hidden>
                    <div className={`h-2 ${bar} ${gone ? 'opacity-60' : ''}`} style={{ marginLeft: `${left}%`, width: `${width}%` }} />
                  </div>
                </td>
                <td className="text-right">
                  {s.tone === 'added' && <Tag tone="added">Added</Tag>}
                  {gone && <Tag tone="removed">Withdrawn</Tag>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
