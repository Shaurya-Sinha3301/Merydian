import { clockLabel } from '../../lib/plan';

export interface Span {
  title: string;
  start: number;
  end: number;
}

interface SwapBarsProps {
  before?: Span | null;
  after?: Span | null;
  /** Axis range in minutes. */
  lo?: number;
  hi?: number;
}

function Lane({
  label,
  span,
  bar,
  struck,
  lo,
  hi,
}: {
  label: string;
  span?: Span | null;
  bar: string;
  struck?: boolean;
  lo: number;
  hi: number;
}) {
  const range = hi - lo;
  const left = span ? ((span.start - lo) / range) * 100 : 0;
  const width = span ? Math.max(((span.end - span.start) / range) * 100, 2) : 0;
  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
      <span className="text-sm font-bold text-ink-2">{label}</span>
      <div className="relative h-9 overflow-hidden bg-panel" aria-hidden>
        {span && (
          <>
            <div
              className={`${struck ? 'snap-in' : 'fill-x'} absolute top-0 h-9 ${bar}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
            {/* The name sits inside a wide bar and beside a narrow one, so it is always readable */}
            <span
              className={`absolute top-0 flex h-9 items-center whitespace-nowrap px-2 text-xs font-extrabold ${
                width > 20 ? (struck ? 'text-paper' : 'text-ink') : 'text-ink'
              } ${struck ? 'line-through decoration-2' : ''}`}
              style={{ left: width > 20 ? `${left}%` : `${left + width}%` }}
            >
              {span.title}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** One swap on a shared time axis: the dropped stop above, the new stop below. */
export function SwapBars({ before, after, lo = 9 * 60, hi = 21 * 60 }: SwapBarsProps) {
  const ticks: number[] = [];
  for (let m = Math.ceil(lo / 180) * 180; m <= hi; m += 180) ticks.push(m);
  const summary = [
    before && `Before: ${before.title}, ${clockLabel(before.start)} to ${clockLabel(before.end)}`,
    after && `After: ${after.title}, ${clockLabel(after.start)} to ${clockLabel(after.end)}`,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <div role="img" aria-label={summary} className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[4.5rem_1fr] gap-3" aria-hidden>
        <span />
        <div className="relative h-4 overflow-x-clip">
          {ticks.map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 text-[11px] font-bold tabular-nums text-ink-3"
              style={{ left: `${((m - lo) / (hi - lo)) * 100}%` }}
            >
              {String(m / 60).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
      <Lane label="Before" span={before} bar="bg-magenta" struck lo={lo} hi={hi} />
      <Lane label="After" span={after} bar="bg-green" lo={lo} hi={hi} />
    </div>
  );
}
