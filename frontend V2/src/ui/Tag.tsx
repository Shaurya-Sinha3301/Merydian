import { type ReactNode } from 'react';

export type Tone = 'added' | 'removed' | 'shifted' | 'pending' | 'ai' | 'neutral';

const tones: Record<Tone, string> = {
  added: 'bg-green text-ink',
  removed: 'bg-magenta text-paper',
  shifted: 'bg-yellow text-ink',
  pending: 'bg-yellow text-ink',
  ai: 'bg-cyan text-ink',
  neutral: 'border border-ink-3 bg-transparent text-ink-2 !rounded-full',
};

/** A small coloured bar carrying one word of state. Colour always means something. */
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md px-2.5 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** The bar colour for a tone, for blocks that are not text. */
export const toneBg: Record<Tone, string> = {
  added: 'bg-green',
  removed: 'bg-magenta',
  shifted: 'bg-yellow',
  pending: 'bg-yellow',
  ai: 'bg-cyan',
  neutral: 'bg-ink',
};
