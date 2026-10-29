import { TripMap } from '../plan/TripMap';
import { MonthGrid } from '../calendar/MonthGrid';
import { Plate } from '../../ui/Photo';
import { Tag } from '../../ui/Tag';
import { HERO_PHOTOS } from '../../lib/photos';
import { tagWords } from '../changes/ChangeRow';

/*
  A sample of the traveller's plan view, using the seeded Family Vacation demo trip.
  It is sample data, labelled as such, and shows what the real screens do.
*/
interface Row {
  time: string;
  stop: string;
  length: string;
  note?: 'withdrawn' | 'added';
  meal?: boolean;
}

const DAY3: Row[] = [
  { time: '09:00', stop: 'Raj Ghat', length: '45 min' },
  { time: '12:30', stop: 'Connaught Place Restaurants', length: '1 h', meal: true },
  { time: '14:00', stop: 'National Museum', length: '2 h', note: 'withdrawn' },
  { time: '14:00', stop: 'Garden of Five Senses', length: '1 h 30', note: 'added' },
  { time: '19:00', stop: 'Evening Fine Dining', length: '1 h 30', meal: true },
];

const CORRECTIONS = [
  {
    tone: 'removed' as const,
    head: 'Withdrawn: National Museum',
    why: 'Two hours indoors with two children, when this family rates outdoor time highest.',
    tags: ['CHILD_FRIENDLY', 'INTEREST_VECTOR_DOMINANCE'],
  },
  {
    tone: 'added' as const,
    head: 'Added: Garden of Five Senses',
    why: 'Open space and interactive exhibits, which fits their nature and adventure interests.',
    tags: ['CHILD_FRIENDLY', 'INTEREST_VECTOR_DOMINANCE'],
  },
];

export function PlanPreview() {
  return (
    <div className="border border-ink bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-2 border-ink px-4 py-3">
        <p className="title text-xl">Family Vacation in Delhi</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span className="tabular-nums">15 to 18 March 2026</span>
          <Tag tone="ai">Version 2</Tag>
          <Tag>Sample, synthetic data</Tag>
        </p>
      </div>

      <div className="grid lg:grid-cols-12">
        <div className="min-w-0 border-b border-rule lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="flex gap-px border-b border-rule bg-rule text-sm font-semibold">
            {['Day 1', 'Day 2', 'Day 3', 'Day 4'].map((d) => (
              <p key={d} className={`flex-1 px-3 py-2 text-center ${d === 'Day 3' ? 'bg-ink text-paper' : 'bg-panel text-ink-2'}`}>
                {d}
              </p>
            ))}
          </div>
          <div className="overflow-x-auto"><table className="ruled">
            <caption className="sr-only">Day 3 timetable, version 2</caption>
            <thead>
              <tr>
                <th>Time</th>
                <th>Stop</th>
                <th>Length</th>
                <th>Version 2</th>
              </tr>
            </thead>
            <tbody>
              {DAY3.map((r) => (
                <tr key={r.time + r.stop} data-row>
                  <td className="font-semibold tabular-nums">{r.time}</td>
                  <td className={r.note === 'withdrawn' ? 'text-ink-3 line-through decoration-magenta decoration-2' : 'font-semibold'}>
                    {r.stop}
                    {r.meal && <span className="ml-2 text-xs font-normal text-ink-3">meal</span>}
                  </td>
                  <td className="tabular-nums text-ink-2">{r.length}</td>
                  <td>{r.note === 'withdrawn' ? <Tag tone="removed">Withdrawn</Tag> : r.note === 'added' ? <Tag tone="added">Added</Tag> : null}</td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <div className="border-t-2 border-ink px-4 pb-5 pt-3">
            <h3 className="title text-lg">Corrections, with reasons</h3>
            <ul className="mt-2 divide-y divide-rule">
              {CORRECTIONS.map((c) => (
                <li key={c.head} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[11rem_1fr]" data-row>
                  <p className={`text-sm font-bold ${c.tone === 'removed' ? 'text-magenta' : 'text-green'}`}>{c.head}</p>
                  <div>
                    <p className="text-ink-2">{c.why}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <li key={t}>
                          <Tag>{tagWords(t)}</Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 bg-panel p-3 lg:col-span-5">
          <TripMap
            label="Map of day 3 across Delhi"
            points={[
              { id: 'LOC_008', title: 'Raj Ghat' },
              { id: 'LOC_019', title: 'Garden of Five Senses' },
            ]}
            ghosts={[{ id: 'LOC_014', title: 'National Museum' }]}
            colors={{ LOC_019: '#1f6b35' }}
            className="h-72 border border-rule"
          />
          <div className="grid grid-cols-[1fr_9rem] gap-3">
            <Plate photo={HERO_PHOTOS.gardens} alt="Lodhi Gardens" imgClassName="aspect-[4/3]" />
            <dl className="border border-rule bg-paper p-3 text-sm">
              <dt className="label">Plan cost</dt>
              <dd className="text-lg font-bold tabular-nums">₹3,440</dd>
              <dt className="label mt-2">vs v1</dt>
              <dd className="text-lg font-bold tabular-nums text-green">−₹3,800</dd>
              <dt className="label mt-2">Fit</dt>
              <dd className="text-lg font-bold tabular-nums">+0.19</dd>
            </dl>
          </div>
          <MonthGrid
            year={2026}
            month={2}
            compact
            events={[{ id: 'trip', label: 'Family Vacation', start: new Date(2026, 2, 15), end: new Date(2026, 2, 18), tone: 'ai' }]}
          />
        </aside>
      </div>
    </div>
  );
}
