import { MonthGrid } from '../calendar/MonthGrid';
import { CostBars } from '../agent/CostBars';
import { Tag } from '../../ui/Tag';

/* Sample of the agent's desk, built from the five seeded demo trips. */
const TRIPS = [
  { name: 'Family Vacation in Delhi', cost: 3440, start: new Date(2026, 2, 15), end: new Date(2026, 2, 18), ask: 'Add Akshardham' },
  { name: 'Luxury Couple Retreat', cost: 6040, start: new Date(2026, 3, 10), end: new Date(2026, 3, 13), ask: 'Add Hauz Khas Village' },
  { name: 'Budget Backpacker Adventure', cost: 860, start: new Date(2026, 4, 1), end: new Date(2026, 4, 5), ask: 'Add Agrasen ki Baoli' },
  { name: 'Relaxing Golden Years Trip', cost: 920, start: new Date(2026, 5, 1), end: new Date(2026, 5, 5), ask: 'Add Lodhi Gardens' },
  { name: 'Accessible Delhi Tour', cost: 2580, start: new Date(2026, 6, 10), end: new Date(2026, 6, 14), ask: 'Add India Gate' },
];

const KPIS = [
  { label: 'Waiting on you', value: 5 },
  { label: 'Trips overseen', value: 5 },
  { label: 'Feedback rounds', value: 5 },
  { label: 'Plan value, INR', value: TRIPS.reduce((n, t) => n + t.cost, 0), prefix: '₹' },
];

export function AgentPreview() {
  return (
    <div className="border border-ink bg-paper">
      <dl className="grid grid-cols-2 divide-x divide-rule border-b-2 border-ink sm:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="px-4 py-3">
            <dt className="label">{k.label}</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums" data-count={k.value} data-prefix={k.prefix}>
              {(k.prefix ?? '') + k.value.toLocaleString('en-IN')}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid lg:grid-cols-12">
        <div className="min-w-0 border-b border-rule lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="overflow-x-auto"><table className="ruled">
            <caption className="sr-only">Requests waiting for the agent, sample</caption>
            <thead>
              <tr>
                <th>Trip</th>
                <th>Request</th>
                <th className="num">Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {TRIPS.map((t) => (
                <tr key={t.name} data-row>
                  <td className="font-semibold">{t.name}</td>
                  <td className="text-ink-2">{t.ask}</td>
                  <td className="num">₹{t.cost.toLocaleString('en-IN')}</td>
                  <td>
                    <Tag tone="pending">Needs a decision</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="border-t-2 border-ink p-4">
            <h3 className="title text-lg">Plan cost by trip</h3>
            <CostBars items={TRIPS.map((t) => ({ label: t.name, value: t.cost }))} className="mt-3" />
          </div>
        </div>
        <div className="min-w-0 bg-panel p-3 lg:col-span-5">
          <h3 className="title mb-2 text-lg">Departures</h3>
          <div className="grid gap-3">
            <MonthGrid
              year={2026}
              month={3}
              compact
              events={TRIPS.filter((t) => t.start.getMonth() === 3).map((t) => ({ id: t.name, label: t.name, start: t.start, end: t.end, tone: 'pending' as const }))}
            />
            <MonthGrid
              year={2026}
              month={4}
              compact
              events={TRIPS.filter((t) => t.start.getMonth() === 4).map((t) => ({ id: t.name, label: t.name, start: t.start, end: t.end, tone: 'ai' as const }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
