import { Tag, toneBg, type Tone } from '../../ui/Tag';
import { formatSignedMoney } from '../../lib/format';

export type ChangeTone = Extract<Tone, 'added' | 'removed' | 'shifted'>;

const LABEL: Record<ChangeTone, string> = { added: 'New', removed: 'Dropped', shifted: 'Moved' };
const BAR_TEXT: Record<ChangeTone, string> = { added: 'text-ink', removed: 'text-paper', shifted: 'text-ink' };

export const TAG_WORDS: Record<string, string> = {
  INTEREST_VECTOR_DOMINANCE: 'matches what they enjoy most',
  BUDGET_SAVING: 'saves money',
  LOW_BUDGET_SENSITIVITY: 'budget is not the limit',
  ENERGY_MATCH: 'fits their energy',
  PACE_PREFERENCE: 'fits their pace',
  CHILD_FRIENDLY: 'works for children',
  ACCESSIBILITY_CONSTRAINT: 'easier to reach',
  SHARED_ANCHOR_REQUIRED: 'keeps a stop everyone shares',
  MUST_VISIT: 'a must-visit',
  NEVER_VISIT: 'was ruled out',
};

export function tagWords(tag: string): string {
  return TAG_WORDS[tag] ?? tag.toLowerCase().replace(/_/g, ' ');
}

interface ChangeRowProps {
  tone: ChangeTone;
  title: string;
  /** e.g. "Day 3, 11:45 to 13:15" */
  when?: string;
  reason?: string;
  costDelta?: number | null;
  tags?: string[];
  index?: number;
}

/** One change: a colour bar naming what happened, then the stop and the reason beneath it. */
export function ChangeRow({ tone, title, when, reason, costDelta, tags = [], index = 0 }: ChangeRowProps) {
  return (
    <article className="snap-in bg-paper" style={{ ['--i' as string]: index }}>
      <div className={`flex items-center justify-between gap-3 px-4 py-1.5 ${toneBg[tone]} ${BAR_TEXT[tone]}`}>
        <p className="text-sm font-extrabold">
          {LABEL[tone]}
          {when ? <span className="font-bold opacity-90"> {'·'} {when}</span> : null}
        </p>
        {costDelta != null && costDelta !== 0 && (
          <p className="text-sm font-extrabold tabular-nums">{formatSignedMoney(costDelta)}</p>
        )}
      </div>
      <div className="px-4 pb-4 pt-3">
        <h3 className={`title text-2xl sm:text-3xl ${tone === 'removed' ? 'line-through decoration-2' : ''}`}>{title}</h3>
        {reason && <p className="mt-2 max-w-[68ch] text-ink-2">{reason}</p>}
        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <li key={t}>
                <Tag tone="neutral">{tagWords(t)}</Tag>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
