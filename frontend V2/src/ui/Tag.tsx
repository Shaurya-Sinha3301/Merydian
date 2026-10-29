import { type ReactNode } from 'react';

export type Tone = 'added' | 'removed' | 'shifted' | 'pending' | 'ai' | 'neutral';

const tones: Record<Tone, string> = {
  added: 'border-green bg-green-tint text-green',
  removed: 'border-magenta bg-red-tint text-magenta',
  shifted: 'border-yellow bg-amber-tint text-yellow',
  pending: 'border-yellow bg-amber-tint text-yellow',
  ai: 'border-cyan bg-navy-tint text-cyan',
  neutral: 'border-rule bg-paper text-ink-2',
};

/** A small stamped label carrying one word of state. Colour always means something. */
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-sm border px-2 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** The solid colour for a tone, for blocks that are not text. */
export const toneBg: Record<Tone, string> = {
  added: 'bg-green text-paper',
  removed: 'bg-magenta text-paper',
  shifted: 'bg-yellow text-paper',
  pending: 'bg-yellow text-paper',
  ai: 'bg-cyan text-paper',
  neutral: 'bg-ink text-paper',
};
