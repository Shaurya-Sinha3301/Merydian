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

/** One lane of the shared time axis: withdrawn stops are an outlined, dashed tick; added stops are solid. */
function Lane({ label, span, withdrawn, lo, hi }: { label: string; span?: Span | null; withdrawn?: boolean; lo: number; hi: number }) {
  const range = hi - lo;
  const left = span ? ((span.start - lo) / range) * 100 : 0;
  const width = span ? Math.max(((span.end - span.start) / range) * 100, 2) : 0;
  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      <div className="relative h-7 bg-panel" aria-hidden>
        {span && (
          <div
            className={`absolute top-1 h-5 ${withdrawn ? 'border border-dashed border-magenta bg-red-tint' : 'bg-green'}`}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        )}
      </div>
      {span && (
        <p className={`col-start-2 -mt-0.5 text-xs font-semibold ${withdrawn ? 'text-magenta line-through decoration-1' : 'text-green'}`}>
          {span.title}
          <span className="ml-2 font-normal tabular-nums text-ink-3">
            {clockLabel(span.start)} to {clockLabel(span.end)}
          </span>
        </p>
      )}
    </div>
  );
}

/** One swap on a shared time axis: the withdrawn stop above, the added stop below. */
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
        <div className="relative h-4">
          {ticks.map((m, i) => (
            <span
              key={m}
              className={`absolute text-[11px] font-semibold tabular-nums text-ink-3 ${i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${((m - lo) / (hi - lo)) * 100}%` }}
            >
              {String(m / 60).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
      <Lane label="Before" span={before} withdrawn lo={lo} hi={hi} />
      <Lane label="After" span={after} lo={lo} hi={hi} />
    </div>
  );
}
