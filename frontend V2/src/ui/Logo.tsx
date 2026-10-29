import { Link } from 'react-router-dom';

/** Three ruled columns on one module: a timetable's smallest form. */
export function Mark({ size = 28, light = false }: { size?: number; light?: boolean }) {
  const ink = light ? '#ffffff' : '#14181d';
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect x="1" y="1" width="26" height="26" fill="none" stroke={ink} strokeWidth="2" />
      <rect x="6" y="6" width="3" height="16" fill={ink} />
      <rect x="12.5" y="6" width="3" height="10" fill="#c4231a" />
      <rect x="19" y="6" width="3" height="13" fill={ink} />
    </svg>
  );
}

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="Merydian home">
      <Mark light={light} />
      <span className={`text-xl font-bold tracking-tight ${light ? 'text-paper' : ''}`}>merydian</span>
    </Link>
  );
}
