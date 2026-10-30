import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTripGroup } from '../../hooks/usePhase3';
import { useChecklist, useExpenses, useGroupMoneyActions } from '../../hooks/usePhase4';
import { Button } from '../../ui/Button';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { formatMoney } from '../../lib/format';

const SWATCH = ['#17407f', '#c4231a', '#1f6b35', '#8a5a00', '#39424c', '#6b7a99'];


function GroupMoney({ tripId, families }: { tripId: string; families: Array<{ family_id: string; name: string; you: boolean }> }) {
  const expenses = useExpenses(tripId);
  const checklist = useChecklist(tripId);
  const actions = useGroupMoneyActions(tripId);
  const mine = families.find((f) => f.you)?.family_id ?? families[0]?.family_id;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState<string>('');
  const [item, setItem] = useState('');

  const addExpense = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (title.trim().length < 2 || !(n > 0)) return;
    actions.addExpense.mutate({ title: title.trim(), amount: n, paid_by: payer || mine }, { onSuccess: () => { setTitle(''); setAmount(''); } });
  };
  const addItem = (e: FormEvent) => {
    e.preventDefault();
    if (item.trim()) actions.addItem.mutate(item.trim(), { onSuccess: () => setItem('') });
  };
  const ex = expenses.data;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="min-w-0 border border-rule bg-paper lg:col-span-7" aria-label="Shared expenses">
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
          <h2 className="title text-lg">Shared expenses</h2>
          <p className="text-sm text-ink-2">
            Total <span className="font-bold tabular-nums">{formatMoney(ex?.total ?? 0)}</span> · split equally
          </p>
        </div>
        {ex && ex.settlements.length > 0 && (
          <ul className="divide-y divide-rule border-b border-rule bg-amber-tint">
            {ex.settlements.map((s) => (
              <li key={`${s.from}-${s.to}`} className="px-4 py-2 text-sm">
                <span className="font-semibold">{s.from_name}</span> pays <span className="font-semibold">{s.to_name}</span> <span className="font-bold tabular-nums">{formatMoney(s.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {ex && ex.settlements.length === 0 && ex.expenses.length > 0 && <p className="border-b border-rule bg-green-tint px-4 py-2 text-sm font-semibold text-green">Everyone is square.</p>}
        <div className="overflow-x-auto">
          <table className="ruled min-w-[28rem]">
            <thead>
              <tr>
                <th>What</th>
                <th>Paid by</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(ex?.expenses ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="font-semibold">{e.title}</td>
                  <td className="text-ink-2">{e.paid_by_name}</td>
                  <td className="num">{formatMoney(e.amount)}</td>
                  <td className="text-right">
                    <button type="button" onClick={() => actions.deleteExpense.mutate(e.id)} className="text-xs font-semibold text-ink-3 underline underline-offset-4 hover:text-ink">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {(ex?.expenses ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="text-ink-3">
                    Nothing shared yet. Add what you paid for the group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {ex && (
          <dl className="grid grid-cols-2 divide-x divide-rule border-t-2 border-ink sm:grid-cols-4">
            {ex.families.map((f) => (
              <div key={f.family_id} className="p-3">
                <dt className="label">{f.name}</dt>
                <dd className={`mt-1 text-lg font-bold tabular-nums ${f.net > 0 ? 'text-green' : f.net < 0 ? 'text-magenta' : ''}`}>{f.net > 0 ? '+' : ''}{formatMoney(f.net)}</dd>
                <dd className="text-xs text-ink-3">paid {formatMoney(f.paid)}</dd>
              </div>
            ))}
          </dl>
        )}
        <form onSubmit={addExpense} className="flex flex-wrap items-end gap-2 border-t border-rule p-3">
          <input aria-label="What was paid for" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Van hire" className="h-10 min-w-[8rem] flex-1 rounded-sm border border-ink bg-paper px-3" />
          <input aria-label="Amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-10 w-28 rounded-sm border border-ink bg-paper px-3" />
          <select aria-label="Paid by" value={payer || mine} onChange={(e) => setPayer(e.target.value)} className="h-10 rounded-sm border border-ink bg-paper px-2">
            {families.map((f) => (
              <option key={f.family_id} value={f.family_id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button type="submit" loading={actions.addExpense.isPending} disabled={title.trim().length < 2 || !(Number(amount) > 0)}>
            Add
          </Button>
        </form>
      </section>

      <section className="min-w-0 self-start border border-rule bg-paper lg:col-span-5" aria-label="Shared checklist">
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
          <h2 className="title text-lg">Shared checklist</h2>
          <p className="text-sm text-ink-3">
            {(checklist.data?.items ?? []).filter((i) => i.done).length} of {(checklist.data?.items ?? []).length} done
          </p>
        </div>
        <ul className="divide-y divide-rule">
          {(checklist.data?.items ?? []).map((i) => (
            <li key={i.id} className="flex items-start gap-3 px-4 py-2.5">
              <input type="checkbox" checked={i.done} onChange={(e) => actions.tick.mutate({ id: i.id, done: e.target.checked })} aria-label={i.text} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
              <span className="min-w-0 flex-1">
                <span className={i.done ? 'text-ink-3 line-through' : ''}>{i.text}</span>
                <span className="block text-xs text-ink-3">{i.added_by}</span>
              </span>
              <button type="button" onClick={() => actions.removeItem.mutate(i.id)} className="text-xs font-semibold text-ink-3 underline underline-offset-4 hover:text-ink">
                Remove
              </button>
            </li>
          ))}
          {(checklist.data?.items ?? []).length === 0 && <li className="px-4 py-5 text-sm text-ink-3">Passports, tickets, who brings what. Everyone on the trip can tick things off.</li>}
        </ul>
        <form onSubmit={addItem} className="flex gap-2 border-t border-rule p-3">
          <input aria-label="New item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Carry passports" className="h-10 min-w-0 flex-1 rounded-sm border border-ink bg-paper px-3" />
          <Button type="submit" variant="outline" loading={actions.addItem.isPending} disabled={!item.trim()}>
            Add
          </Button>
        </form>
      </section>
    </div>
  );
}

/** A group trip: one shared plan and, where a family's plan differs, its own branch. */
export function GroupPage() {
  const { tripId = '' } = useParams();
  const { data, isLoading, error } = useTripGroup(tripId);
  const [picked, setPicked] = useState<number | null>(null);

  if (isLoading) return <Loading label="Loading the group" />;
  if (error || !data) return <ErrorNote>The group could not be loaded.</ErrorNote>;
  if (data.families.length < 2) return <Empty title="This is a single-family trip">Group trips show each family's plan side by side. Ask your agent to add another family.</Empty>;

  const colour = (fid: string) => SWATCH[Math.max(0, data.families.findIndex((f) => f.family_id === fid)) % SWATCH.length];
  const name = (fid: string) => data.families.find((f) => f.family_id === fid)?.name ?? fid;
  const day = data.days.find((d) => d.day === (picked ?? data.days[0]?.day)) ?? data.days[0];
  const { shared_stops: shared, branch_stops: branch } = data.summary;

  return (
    <div className="flex flex-col gap-6">
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="min-w-0 border border-rule bg-paper lg:col-span-4" aria-label="Families">
        <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Families on this trip</h2>
        <ul className="divide-y divide-rule">
          {data.families.map((f) => (
            <li key={f.family_id} className="flex gap-3 px-4 py-3">
              <span aria-hidden className="mt-1.5 h-3 w-3 shrink-0" style={{ background: colour(f.family_id) }} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {f.name} {f.you && <span className="ml-1 text-xs font-normal text-ink-3">you</span>}
                </p>
                <p className="text-sm text-ink-2">
                  {f.members} travellers{f.children ? `, ${f.children} children` : ''}
                  {f.pace ? ` · ${f.pace} pace` : ''}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  {f.version ? `v${f.version}` : 'No plan'} · {formatMoney(f.cost)} · fit {f.fit != null ? `${Math.round(f.fit)}%` : '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 divide-x divide-rule border-t-2 border-ink text-center">
          <div className="p-3">
            <dt className="label">Shared by all</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{shared}</dd>
          </div>
          <div className="p-3">
            <dt className="label">Family branches</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{branch}</dd>
          </div>
        </dl>
        <p className="border-t border-rule px-4 py-3 text-xs text-ink-3">
          The optimizer builds one plan for everyone first. A stop appears as a branch when a family's plan differs from the others.
        </p>
      </section>

      <section className="min-w-0 lg:col-span-8" aria-label="Day by day">
        <div role="tablist" aria-label="Days" className="flex overflow-x-auto border border-rule bg-paper">
          {data.days.map((d) => (
            <button key={d.day} role="tab" aria-selected={d.day === day?.day} onClick={() => setPicked(d.day)} className={`shrink-0 border-r border-rule px-4 py-2 text-sm font-semibold ${d.day === day?.day ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-panel'}`}>
              Day {d.day}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto border border-rule bg-paper">
          <table className="ruled min-w-[34rem]">
            <thead>
              <tr>
                <th className="w-28">Time</th>
                <th>Stop</th>
                <th>Who goes</th>
              </tr>
            </thead>
            <tbody>
              {day?.stops.map((s) => (
                <tr key={s.location_id}>
                  <td className="whitespace-nowrap tabular-nums">
                    {s.start ?? '—'}
                    {s.end ? <span className="text-ink-3"> to {s.end}</span> : null}
                  </td>
                  <td className="font-semibold">
                    {s.name}
                    {s.meal && <span className="ml-2 text-xs font-normal text-ink-3">meal</span>}
                  </td>
                  <td>
                    {s.shared ? (
                      <Tag tone="ai">Everyone</Tag>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {s.families.map((fid) => (
                          <span key={fid} className="inline-flex items-center gap-1.5 border border-rule px-1.5 py-0.5 text-xs font-semibold">
                            <span aria-hidden className="h-2 w-2" style={{ background: colour(fid) }} />
                            {name(fid)}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <GroupMoney tripId={tripId} families={data.families} />
    </div>
  );
}
