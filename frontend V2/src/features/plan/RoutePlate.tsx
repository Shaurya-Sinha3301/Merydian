import { DELHI_STOPS } from '../../lib/delhiStops';

export interface PlateRoute {
  ids: string[];
  color: string; // css colour
  width?: number;
}

interface RoutePlateProps {
  routes: PlateRoute[];
  /** Stop ids to label. */
  labelled?: string[];
  /** Fill colour per stop id, for stops that carry a state. */
  stopColors?: Record<string, string>;
  className?: string;
  title: string;
}

const W = 640;
const H = 470;
const PAD = 56;

const lats = DELHI_STOPS.map((s) => s.lat);
const lngs = DELHI_STOPS.map((s) => s.lng);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);
const minLng = Math.min(...lngs);
const maxLng = Math.max(...lngs);
const cosLat = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const spanX = (maxLng - minLng) * cosLat;
const spanY = maxLat - minLat;
const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
const offX = (W - spanX * scale) / 2;
const offY = (H - spanY * scale) / 2;

function project(lat: number, lng: number): [number, number] {
  return [offX + (lng - minLng) * cosLat * scale, offY + (maxLat - lat) * scale];
}

const POINTS = new Map(DELHI_STOPS.map((s) => [s.id, { ...s, xy: project(s.lat, s.lng) }]));

/** Transit-map routing: one 45 degree run, then straight. */
function octilinear(a: [number, number], b: [number, number]): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const diag = Math.min(Math.abs(dx), Math.abs(dy));
  const mid: [number, number] = [a[0] + Math.sign(dx) * diag, a[1] + Math.sign(dy) * diag];
  return `L${mid[0].toFixed(1)} ${mid[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}

function pathFor(ids: string[]): string {
  const pts = ids.map((id) => POINTS.get(id)?.xy).filter(Boolean) as [number, number][];
  if (pts.length < 2) return '';
  return pts.reduce(
    (d, p, i) => (i === 0 ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `${d} ${octilinear(pts[i - 1], p)}`),
    '',
  );
}

/** The real stop coordinates drawn flat: stops are squares, routes are bars. */
export function RoutePlate({ routes, labelled = [], stopColors = {}, className = '', title }: RoutePlateProps) {
  const onRoute = new Set(routes.flatMap((r) => r.ids));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <rect width={W} height={H} fill="#f5f7f9" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={(W / 8) * i} x2={(W / 8) * i} y1={0} y2={H} stroke="#c6cdd5" strokeWidth={1} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={`h${i}`} y1={(H / 7) * i} y2={(H / 7) * i} x1={0} x2={W} stroke="#c6cdd5" strokeWidth={1} />
      ))}
      {routes.map((r, i) => (
        <path
          key={i}
          d={pathFor(r.ids)}
          fill="none"
          stroke={r.color}
          strokeWidth={r.width ?? 12}
          strokeLinejoin="miter"
          strokeLinecap="butt"
          style={{ mixBlendMode: 'multiply' }}
        />
      ))}
      {DELHI_STOPS.map((s) => {
        const [x, y] = POINTS.get(s.id)!.xy;
        const hot = onRoute.has(s.id);
        return (
          <g key={s.id}>
            <rect
              x={x - (hot ? 8 : 4)}
              y={y - (hot ? 8 : 4)}
              width={hot || stopColors[s.id] ? 16 : 8}
              height={hot || stopColors[s.id] ? 16 : 8}
              fill={stopColors[s.id] ?? (hot ? '#101418' : '#56606c')}
              stroke={hot ? '#f5f7f9' : 'none'}
              strokeWidth={3}
            />
            {labelled.includes(s.id) && (
              <text
                x={x + 14}
                y={y + 5}
                fontSize={15}
                fontWeight={800}
                fill="#101418"
                stroke="#f5f7f9"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {s.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
