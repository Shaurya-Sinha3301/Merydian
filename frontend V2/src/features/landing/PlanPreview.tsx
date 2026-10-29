import { MapPin, Utensils } from 'lucide-react';
import { TripMap } from '../plan/TripMap';
import { Photo, PhotoCaption } from '../../ui/Photo';
import { Tag } from '../../ui/Tag';
import { photoForStop, HERO_PHOTOS } from '../../lib/photos';
import { tagWords } from '../changes/ChangeRow';

/*
  A sample of the traveller's plan view, using the seeded Family Vacation demo trip.
  It is sample data, labelled as such, and shows what the real screens do.
*/
interface SampleStop {
  time: string;
  name: string;
  detail: string;
  kind: 'sight' | 'meal';
  state?: 'added' | 'removed';
}

const DAY3: SampleStop[] = [
  { time: '09:00', name: 'Raj Ghat', detail: '45 min', kind: 'sight' },
  { time: '12:30', name: 'Connaught Place Restaurants (Lunch)', detail: '1 h', kind: 'meal' },
  { time: '14:00', name: 'National Museum', detail: '2 h', kind: 'sight', state: 'removed' },
  { time: '14:00', name: 'Garden of Five Senses', detail: '1 h 30 min', kind: 'sight', state: 'added' },
  { time: '19:00', name: 'Evening Fine Dining (Dinner)', detail: '1 h 30 min', kind: 'meal' },
];

function Thumb({ stop }: { stop: SampleStop }) {
  const photo = photoForStop(stop.name);
  if (photo) return <Photo photo={photo} alt="" className="h-16 w-20 shrink-0 rounded-lg" />;
  const Icon = stop.kind === 'meal' ? Utensils : MapPin;
  const bg = stop.state === 'added' ? 'bg-green' : stop.kind === 'meal' ? 'bg-ink text-paper' : 'bg-cyan';
  return (
    <div className={`flex h-16 w-20 shrink-0 items-center justify-center rounded-lg ${bg}`}>
      <Icon aria-hidden size={22} strokeWidth={2.2} />
    </div>
  );
}

export function PlanPreview() {
  return (
    <div className="overflow-hidden rounded-3xl bg-paper shadow-[var(--shadow-lift)]">
      <div className="grid lg:grid-cols-12">
        {/* Day list */}
        <nav aria-label="Days (sample)" className="hidden border-r border-rule p-4 lg:col-span-2 lg:block">
          <p className="label mb-2">Family Vacation in Delhi</p>
          <ul className="flex flex-col gap-1 text-sm font-bold">
            {['Day 1', 'Day 2', 'Day 3', 'Day 4'].map((d) => (
              <li key={d} className={`rounded-lg px-3 py-2 ${d === 'Day 3' ? 'bg-ink text-paper' : 'text-ink-2'}`}>
                {d}
              </li>
            ))}
          </ul>
        </nav>

        {/* Timeline */}
        <div className="p-4 sm:p-6 lg:col-span-6">
          <Photo photo={HERO_PHOTOS.tomb} alt="Humayun's Tomb in Delhi" scrim className="h-40 rounded-2xl sm:h-48">
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-4 text-paper">
              <div>
                <p className="text-sm font-bold opacity-90">Version 2</p>
                <p className="display text-4xl">Day 3</p>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-paper/90 px-2.5 py-1 text-xs font-bold text-ink">4 stops</span>
                <span className="rounded-full bg-green px-2.5 py-1 text-xs font-bold text-ink">1 new</span>
                <span className="rounded-full bg-magenta px-2.5 py-1 text-xs font-bold text-paper">1 dropped</span>
              </div>
            </div>
          </Photo>
          <ol className="mt-4 flex flex-col gap-2">
            {DAY3.map((s) => (
              <li key={s.time + s.name} className="flex items-center gap-3 rounded-xl p-1.5 odd:bg-panel">
                <Thumb stop={s} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tabular-nums text-ink-3">
                    {s.time} · {s.detail}
                  </p>
                  <p className={`text-sm font-extrabold leading-snug sm:text-base ${s.state === 'removed' ? 'line-through decoration-2' : ''}`}>
                    {s.name}
                  </p>
                </div>
                {s.state === 'added' && <Tag tone="added">New</Tag>}
                {s.state === 'removed' && <Tag tone="removed">Dropped</Tag>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink-3">Sample from the Family Vacation demo trip, synthetic data.</p>
        </div>

        {/* Map and numbers */}
        <aside className="flex flex-col gap-4 bg-panel p-4 sm:p-6 lg:col-span-4">
          <TripMap
            label="Map of day 3 across Delhi"
            points={[
              { id: 'LOC_008', title: 'Raj Ghat' },
              { id: 'LOC_019', title: 'Garden of Five Senses' },
            ]}
            ghosts={[{ id: 'LOC_014', title: 'National Museum' }]}
            colors={{ LOC_019: '#3cb043' }}
            className="h-72 rounded-2xl bg-paper"
          />
          <section className="rounded-2xl bg-paper p-4" aria-label="What this version changed">
            <h3 className="title text-xl">This version</h3>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-panel p-2">
                <dt className="label">Plan cost</dt>
                <dd className="text-lg font-extrabold">₹3,440</dd>
              </div>
              <div className="rounded-xl bg-panel p-2">
                <dt className="label">vs v1</dt>
                <dd className="text-lg font-extrabold text-green-ink">−₹3,800</dd>
              </div>
              <div className="rounded-xl bg-panel p-2">
                <dt className="label">Fit</dt>
                <dd className="text-lg font-extrabold">+0.19</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {/* Why this plan: reasoning in the margin */}
      <section className="border-t border-rule bg-paper p-4 sm:p-6" aria-labelledby="why">
        <h3 id="why" className="title text-2xl">
          Why this plan?
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border-2 border-magenta p-4">
            <p className="text-sm font-extrabold text-magenta-ink">Dropped: National Museum</p>
            <p className="mt-1 text-ink-2">Two hours indoors with two children, when this family rates outdoor time highest.</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {['CHILD_FRIENDLY', 'INTEREST_VECTOR_DOMINANCE'].map((t) => (
                <li key={t}>
                  <Tag>{tagWords(t)}</Tag>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border-2 border-green p-4">
            <p className="text-sm font-extrabold text-green-ink">New: Garden of Five Senses</p>
            <p className="mt-1 text-ink-2">Open space and interactive exhibits, which fits their nature and adventure interests.</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {['CHILD_FRIENDLY', 'INTEREST_VECTOR_DOMINANCE'].map((t) => (
                <li key={t}>
                  <Tag>{tagWords(t)}</Tag>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <PhotoCaption photo={HERO_PHOTOS.tomb} className="mt-3 text-ink-3" />
      </section>
    </div>
  );
}
