import { Link } from 'react-router-dom';

/** Three bars on one module: the identity in its smallest form. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" fill="#101418" />
      <rect x="5" y="6" width="5" height="16" fill="#00a3e0" />
      <rect x="11.5" y="6" width="5" height="10" fill="#e4007c" />
      <rect x="18" y="6" width="5" height="13" fill="#ffd200" />
    </svg>
  );
}

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="Merydian home">
      <Mark />
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-paper' : ''}`}>merydian</span>
    </Link>
  );
}
