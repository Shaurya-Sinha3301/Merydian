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

/** One correction, printed as a ruled row: the withdrawn and added stops on a shared axis, the reason beside them. */
export function SwapCard({ day, before, after, reason, costDelta, tags = [], index = 0 }: SwapCardProps) {
  const beforePhoto = before ? photoForStop(before.title) : undefined;
  const afterPhoto = after ? photoForStop(after.title) : undefined;

  return (
    <article className="snap-in grid border border-rule bg-paper lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" style={{ ['--i' as string]: index }}>
      <div className="border-b border-rule p-4 lg:border-b-0 lg:border-r">
        <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Day {day}</span>
          {before && <Tag tone="removed">Withdrawn</Tag>}
          {after && <Tag tone="added">Added</Tag>}
          {costDelta != null && costDelta !== 0 && (
            <span className={`ml-auto font-semibold tabular-nums ${costDelta < 0 ? 'text-green' : 'text-magenta'}`}>{formatSignedMoney(costDelta)}</span>
          )}
        </p>
        <SwapBars before={before} after={after} />
      </div>
      <div className="p-4">
        <h3 className="title text-xl">
          {before && after ? (
            <>
              <span className="text-ink-3 line-through decoration-magenta decoration-2">{before.title}</span>
              <span aria-hidden className="mx-2 text-ink-3">
                {'→'}
              </span>
              <span className="sr-only"> replaced by </span>
              {after.title}
            </>
          ) : after ? (
            after.title
          ) : (
            <span className="text-ink-3 line-through decoration-magenta decoration-2">{before?.title}</span>
          )}
        </h3>
        {reason && <p className="mt-2 max-w-[60ch] text-ink-2">{reason}</p>}
        {(beforePhoto || afterPhoto) && (
          <div className="mt-3 flex gap-2">
            {beforePhoto && <Photo photo={beforePhoto} alt="" className="h-16 w-24 opacity-70" />}
            {afterPhoto && <Photo photo={afterPhoto} alt="" className="h-16 w-24" />}
          </div>
        )}
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
