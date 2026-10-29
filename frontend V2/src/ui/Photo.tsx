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

/** The earlier identity's colour bands. The timetable world has none; kept as a no-op so callers compile. */
export function Bands(_props: { side?: 'left' | 'right'; width?: string }) {
  return null;
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

/** A photograph as a printed plate: thin frame, a caption line naming the place, the credit beneath. */
export function Plate({
  photo,
  alt = '',
  className = '',
  imgClassName = 'aspect-[4/3]',
  priority = false,
  unmask = false,
}: {
  photo?: PhotoCredit;
  alt?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  unmask?: boolean;
}) {
  if (!photo) return null;
  return (
    <figure className={`border border-rule bg-paper p-1.5 ${className}`}>
      <div className="overflow-hidden" {...(unmask ? { 'data-unmask': '' } : {})}>
        <Photo photo={photo} alt={alt} priority={priority} className={`w-full ${imgClassName}`} />
      </div>
      <figcaption className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] text-ink-3">
        <span className="font-semibold text-ink-2">{photo.name}</span>
        <PhotoCaption photo={photo} />
      </figcaption>
    </figure>
  );
}
