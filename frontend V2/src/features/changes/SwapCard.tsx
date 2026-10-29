import { SwapBars, type Span } from './SwapBars';
import { tagWords } from './ChangeRow';
import { Tag } from '../../ui/Tag';
import { Photo } from '../../ui/Photo';
import { photoForStop } from '../../lib/photos';
import { formatSignedMoney } from '../../lib/format';

interface SwapCardProps {
  day: number;
  before?: Span | null;
  after?: Span | null;
  reason?: string;
  costDelta?: number | null;
  tags?: string[];
  index?: number;
}

/** A stop's photo, or a plain tinted panel naming it when we hold no photograph. */
function Pane({ span, tone }: { span?: Span | null; tone: 'before' | 'after' }) {
  const photo = span ? photoForStop(span.title) : undefined;
  const tint = tone === 'before' ? 'bg-magenta/40' : 'bg-green/40';
  if (photo)
    return (
      <Photo photo={photo} alt="" className="h-28 sm:h-36">
        {tone === 'before' && <div className="absolute inset-0 bg-magenta/40 mix-blend-multiply" aria-hidden />}
      </Photo>
    );
  return (
    <div className={`flex h-28 items-center justify-center p-4 text-center sm:h-36 ${span ? tint : 'bg-panel'}`}>
      <p className="title text-xl sm:text-2xl">{span ? span.title : 'None'}</p>
    </div>
  );
}

/** One change as a before and after pair: two colour bars on one axis, one reason beneath. */
export function SwapCard({ day, before, after, reason, costDelta, tags = [], index = 0 }: SwapCardProps) {
  const title =
    before && after ? (
      <>
        <span className="line-through decoration-2">{before.title}</span>
        <span aria-hidden className="mx-2 text-ink-3">
          {'→'}
        </span>
        <span className="sr-only"> replaced by </span>
        {after.title}
      </>
    ) : after ? (
      after.title
    ) : (
      <span className="line-through decoration-2">{before?.title}</span>
    );

  return (
    <article className="snap-in overflow-hidden border border-rule bg-paper" style={{ ['--i' as string]: index }}>
      <div className="grid grid-cols-2 text-sm font-extrabold">
        <p className="bg-magenta px-4 py-1.5 text-paper">{before ? 'Dropped' : 'Nothing dropped'}</p>
        <p className="flex items-center justify-between bg-green px-4 py-1.5 text-paper">
          <span>{after ? 'New' : 'Nothing added'}</span>
          {costDelta != null && costDelta !== 0 && <span className="tabular-nums">{formatSignedMoney(costDelta)}</span>}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-paper">
        <Pane span={before} tone="before" />
        <Pane span={after} tone="after" />
      </div>
      <div className="px-4 pb-5 pt-5">
        <SwapBars before={before} after={after} />
        <h3 className="title mt-5 text-2xl sm:text-3xl">{title}</h3>
        <p className="mt-1 text-sm font-bold text-ink-3">Day {day}</p>
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
