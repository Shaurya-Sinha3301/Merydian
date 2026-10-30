import { useId } from 'react';

const NAVY = '#17407f';
const FOREST = '#1f6b35';
const RED = '#c4231a';
const AMBER = '#8a5a00';
const GRID = '#c9cfd6';
const INK3 = '#56606c';

export const SERIES = [NAVY, RED, FOREST, AMBER, '#39424c', '#6b7a99', '#8c4a3a', '#3d7a7a'];

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

/** Vertical columns on a ruled scale. Optional second series is stacked on the first. */
export function Columns({
  items,
  height = 180,
  format = compact,
  label,
}: {
  items: Array<{ label: string; value: number; second?: number }>;
  height?: number;
  format?: (n: number) => string;
  label: string;
}) {
  const W = 380;
  const pad = { l: 34, r: 8, t: 10, b: 26 };
  const max = niceMax(Math.max(1, ...items.map((i) => i.value + (i.second ?? 0))));
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const step = iw / Math.max(1, items.length);
  const bw = Math.min(34, step * 0.62);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * (1 - t)} y2={pad.t + ih * (1 - t)} stroke={GRID} strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={pad.l - 6} y={pad.t + ih * (1 - t) + 3} textAnchor="end" fontSize="10" fill={INK3}>
            {format(max * t)}
          </text>
        </g>
      ))}
      {items.map((i, idx) => {
        const x = pad.l + step * idx + (step - bw) / 2;
        const h1 = (i.value / max) * ih;
        const h2 = ((i.second ?? 0) / max) * ih;
        return (
          <g key={i.label}>
            <rect x={x} y={pad.t + ih - h1} width={bw} height={h1} fill={NAVY} />
            {h2 > 0 && <rect x={x} y={pad.t + ih - h1 - h2} width={bw} height={h2} fill={AMBER} />}
            <text x={x + bw / 2} y={height - 9} textAnchor="middle" fontSize="10" fill={INK3}>
              {i.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** One line per trip across its versions: cost at version 1, 2, 3. */
export function Lines({
  series,
  height = 190,
  label,
  format = compact,
}: {
  series: Array<{ name: string; points: Array<{ x: number; y: number }> }>;
  height?: number;
  label: string;
  format?: (n: number) => string;
}) {
  const W = 380;
  const pad = { l: 38, r: 10, t: 10, b: 24 };
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  const xMax = Math.max(2, ...xs);
  const max = niceMax(Math.max(1, ...ys));
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const X = (x: number) => pad.l + ((x - 1) / (xMax - 1)) * iw;
  const Y = (y: number) => pad.t + ih * (1 - y / max);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * (1 - t)} y2={pad.t + ih * (1 - t)} stroke={GRID} strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={pad.l - 6} y={pad.t + ih * (1 - t) + 3} textAnchor="end" fontSize="10" fill={INK3}>
              {format(max * t)}
            </text>
          </g>
        ))}
        {Array.from({ length: xMax }, (_, i) => i + 1).map((v) => (
          <text key={v} x={X(v)} y={height - 7} textAnchor="middle" fontSize="10" fill={INK3}>
            v{v}
          </text>
        ))}
        {series.map((s, i) => {
          const d = s.points.map((p, k) => `${k === 0 ? 'M' : 'L'}${X(p.x)},${Y(p.y)}`).join(' ');
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="2" strokeDasharray={s.points.length < 2 ? '3 3' : undefined} />
              {s.points.map((p) => (
                <rect key={p.x} x={X(p.x) - 3} y={Y(p.y) - 3} width="6" height="6" fill={SERIES[i % SERIES.length]} />
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {series.map((s, i) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2" style={{ background: SERIES[i % SERIES.length] }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cost against fit, one square per trip. */
export function Scatter({
  points,
  height = 190,
  label,
}: {
  points: Array<{ name: string; x: number; y: number }>;
  height?: number;
  label: string;
}) {
  const W = 380;
  const pad = { l: 38, r: 12, t: 12, b: 28 };
  const xmax = niceMax(Math.max(1, ...points.map((p) => p.x)));
  const ymin = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y), 100) / 10) * 10 - 10);
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const X = (x: number) => pad.l + (x / xmax) * iw;
  const Y = (y: number) => pad.t + ih * (1 - (y - ymin) / (100 - ymin));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {[ymin, (ymin + 100) / 2, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke={GRID} strokeWidth={v === ymin ? 1.5 : 1} />
          <text x={pad.l - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill={INK3}>
            {Math.round(v)}%
          </text>
        </g>
      ))}
      {[0, 0.5, 1].map((t) => (
        <text key={t} x={X(xmax * t)} y={height - 8} textAnchor="middle" fontSize="10" fill={INK3}>
          {compact(xmax * t)}
        </text>
      ))}
      {points.map((p, i) => (
        <g key={p.name + i}>
          <rect x={X(p.x) - 5} y={Y(p.y) - 5} width="10" height="10" fill={NAVY} fillOpacity="0.85" stroke="#fff" />
          <title>{`${p.name}: ₹${Math.round(p.x).toLocaleString('en-IN')}, fit ${Math.round(p.y)}%`}</title>
        </g>
      ))}
    </svg>
  );
}

/** A single value shown as a share of a whole: a ruled segmented bar with a legend. */
export function Split({
  parts,
  label,
}: {
  parts: Array<{ label: string; value: number; color: string }>;
  label: string;
}) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const id = useId();
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden border border-ink bg-panel" role="img" aria-label={label} id={id}>
        {parts.map((p) => (
          <span key={p.label} style={{ width: total ? `${(p.value / total) * 100}%` : 0, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2 grid gap-1 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5" style={{ background: p.color }} />
              {p.label}
            </span>
            <span className="font-semibold tabular-nums">
              {p.value}
              {total ? <span className="ml-1.5 font-normal text-ink-3">{Math.round((p.value / total) * 100)}%</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const COLORS = { navy: NAVY, forest: FOREST, red: RED, amber: AMBER };
