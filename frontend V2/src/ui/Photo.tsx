import { type ReactNode } from 'react';
import type { PhotoCredit } from '../data/photoCredits';

interface PhotoProps {
  photo?: PhotoCredit;
  /** What the picture shows, for people who cannot see it. Empty when it is decoration. */
  alt?: string;
  className?: string;
  /** Darken the lower part so text laid over the photo stays readable. */
  scrim?: boolean;
  /** Above-the-fold photos load straight away instead of lazily. */
  priority?: boolean;
  children?: ReactNode;
}

/** A photograph filling its box. With no photo it falls back to a flat ink block, never an empty hole. */
export function Photo({ photo, alt = '', className = '', scrim = false, priority = false, children }: PhotoProps) {
  return (
    <div className={`relative isolate overflow-hidden bg-ink ${className}`}>
      {photo && (
        <img
          src={photo.file}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      )}
      {scrim && (
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
      )}
      {children}
    </div>
  );
}

const BAND_COLORS = ['#00a3e0', '#e4007c', '#ffd200', '#3cb043'];

/**
 * The identity's signature over a photo: vertical colour bands that multiply into the picture,
 * so the photograph shows through each band in its colour.
 */
export function Bands({ side = 'right', width = '42%' }: { side?: 'left' | 'right'; width?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} flex`}
      style={{ width }}
    >
      {BAND_COLORS.map((c) => (
        <span key={c} className="h-full flex-1 mix-blend-multiply" style={{ background: c, opacity: 0.92 }} />
      ))}
    </div>
  );
}

/** One short credit line for a photo, as its licence asks. */
export function PhotoCaption({ photo, className = '' }: { photo?: PhotoCredit; className?: string }) {
  if (!photo) return null;
  return (
    <p className={`text-[11px] ${className}`}>
      Photo: {photo.author},{' '}
      <a href={photo.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {photo.license}
      </a>
    </p>
  );
}
