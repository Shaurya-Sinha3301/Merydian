import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAcceptOption, useDeclineRequest, useDecisions } from '../../hooks/useDecisions';
import { useTripPlan } from '../../hooks/useTripData';
import { useFleet } from '../../features/agent/useFleet';
import { TripMap } from '../../features/plan/TripMap';
import { Button } from '../../ui/Button';
import { Photo } from '../../ui/Photo';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag, type Tone } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { formatMoney, formatSignedMoney, timeAgo } from '../../lib/format';
import { photoForTrip } from '../../lib/photos';
import { useTitle } from '../../lib/useTitle';
import type { Decision, DecisionOption } from '../../services/decisions';

const ACTION_WORDS: Record<string, string> = {
  add_evening: 'Add in the evening',
  add: 'Add',
  remove: 'Drop',
  swap: 'Swap',
  split: 'Split the group',
};

const STATE: Record<Decision['status'], { tone: Tone; label: string }> = {
  pending: { tone: 'pending', label: 'Needs your decision' },
  accepted: { tone: 'added', label: 'Accepted' },
  declined: { tone: 'removed', label: 'Declined' },
};

function changesOf(o: DecisionOption): Array<Record<string, unknown>> {
  return o.details?.schedule_changes ?? [];
}

const isKeep = (o: DecisionOption) => changesOf(o).length === 0 && o.details?.type !== 'base_itinerary';

function DecisionView({ decision, onDone }: { decision: Decision; onDone: (eventId: string) => void }) {
  const accept = useAcceptOption();
  const decline = useDeclineRequest();
  const plan = useTripPlan(decision.trip_id);
  const [confirm, setConfirm] = useState(false);
  const pending = decision.status === 'pending';
  const proposals = decision.options.filter((o) => !isKeep(o));
  const best = [...proposals].sort((a, b) => b.satisfaction - a.satisfaction)[0];
  const busy = accept.isPending || decline.isPending;
  const points = plan.days.flatMap((d) => d.stops.filter((s) => s.category !== 'meal').map((s) => ({ id: s.id, title: s.title })));
  const fitNow = decision.current_fit != null ? decision.current_fit * 10 : null;
  const title = decision.trip_name || decision.trip_id;
  const state = STATE[decision.status];

  return (
    <section aria-label={title} className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display text-2xl sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-ink-2">
            {decision.kind === 'first_plan' ? 'First plan' : 'Change request'} · raised {timeAgo(decision.created_at)}
            {decision.current_cost != null ? ` · ${formatMoney(decision.current_cost)} now` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tag tone={state.tone}>{state.label}</Tag>
          <Link to={tripPath(decision.trip_id)} className="text-sm font-semibold underline underline-offset-4">
            Open trip
          </Link>
        </div>
      </div>
      {decision.request && <p className="mt-3 max-w-[72ch] border-l border-ink pl-3 text-ink-2">{decision.request}</p>}

      {pending && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border border-ink bg-paper p-3" role="group" aria-label="Decide">
          {best && (
            <Button variant="cyan" loading={accept.isPending} disabled={busy} onClick={() => accept.mutate(best.option_id, { onSuccess: () => onDone(decision.event_id) })}>
              Accept: {best.summary.length > 44 ? `${best.summary.slice(0, 44)}…` : best.summary}
            </Button>
          )}
          {!confirm ? (
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(true)}>
              Decline request
            </Button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">Decline and keep the plan as it is?</span>
              <Button variant="outline" loading={decline.isPending} onClick={() => decline.mutate({ eventId: decision.event_id }, { onSuccess: () => onDone(decision.event_id) })}>
                Yes, decline
              </Button>
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </span>
          )}
          <p className="ml-auto text-xs text-ink-3">Nothing reaches the traveller until you decide.</p>
        </div>
      )}
      {(accept.isError || decline.isError) && (
        <div className="mt-3">
          <ErrorNote>That did not go through. Please try again.</ErrorNote>
        </div>
      )}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="border border-rule bg-paper">
          <h3 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Options against the current plan</h3>
          <div className="overflow-x-auto">
            <table className="ruled min-w-[38rem]">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>What changes</th>
                  <th className="num">Cost</th>
                  <th className="num">vs now</th>
                  <th className="num">Fit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {decision.options.map((o) => {
                  const changes = changesOf(o);
                  const keeps = isKeep(o);
                  const costDelta = decision.current_cost != null ? o.cost - decision.current_cost : null;
                  const fit = Math.round(o.satisfaction * 100);
                  const fitDelta = fitNow != null ? Math.round(o.satisfaction * 100 - fitNow) : null;
                  return (
                    <tr key={o.option_id} className="align-top">
                      <td className="max-w-[16rem]">
                        <p className="font-semibold">{keeps ? 'Keep the current plan' : o.summary}</p>
                        <p className="mt-1">
                          <Tag tone={o.status === 'APPROVED' ? 'added' : o.status === 'REJECTED' ? 'removed' : 'pending'}>
                            {o.status === 'APPROVED' ? 'Accepted' : o.status === 'REJECTED' ? 'Not chosen' : 'Waiting'}
                          </Tag>
                        </p>
                      </td>
                      <td>
                        {keeps ? (
                          <span className="text-ink-2">Nothing. The plan stays as it is.</span>
                        ) : changes.length === 0 ? (
                          <span className="text-ink-2">The full first plan.</span>
                        ) : (
                          <ul className="flex flex-col gap-1">
                            {changes.map((c, i) => (
                              <li key={i} className="flex items-baseline gap-2 text-sm">
                                <Tag tone={String(c.action) === 'remove' ? 'removed' : 'added'}>{ACTION_WORDS[String(c.action)] ?? 'Change'}</Tag>
                                <span className="font-semibold">
                                  {c.day ? `Day ${String(c.day)}: ` : ''}
                                  {String(c.poi_name ?? c.add ?? c.remove ?? '')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="num font-semibold">{formatMoney(o.cost)}</td>
                      <td className={`num ${costDelta && costDelta > 0 ? 'text-magenta' : costDelta && costDelta < 0 ? 'text-green' : ''}`}>
                        {costDelta == null ? '—' : costDelta === 0 ? '±0' : formatSignedMoney(costDelta)}
                      </td>
                      <td className="num">
                        {fit}%
                        {fitDelta != null && fitDelta !== 0 && !keeps && (
                          <span className={`ml-1 text-xs ${fitDelta > 0 ? 'text-green' : 'text-magenta'}`}>
                            {fitDelta > 0 ? '+' : ''}
                            {fitDelta}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        {pending && (
                          <Button
                            variant={keeps ? 'outline' : 'cyan'}
                            loading={accept.isPending && accept.variables === o.option_id}
                            disabled={busy}
                            onClick={() => accept.mutate(o.option_id, { onSuccess: () => onDone(decision.event_id) })}
                          >
                            {keeps ? 'Keep plan' : 'Accept'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {decision.status !== 'pending' && decision.decided_at && (
            <p className="border-t border-rule px-4 py-3 text-sm text-ink-2">
              {decision.status === 'accepted' ? 'Accepted' : 'Declined'} {timeAgo(decision.decided_at)}.
            </p>
          )}
        </div>

        {points.length > 0 && <TripMap label={`Stops of ${title}`} points={points} className="h-72 border border-rule" />}
      </div>
    </section>
  );
}

type Tab = 'pending' | 'decided';

export function DeskPage() {
  useTitle('Desk');
  const fleet = useFleet();
  const decisions = useDecisions();
  const [tab, setTab] = useState<Tab>('pending');
  const [picked, setPicked] = useState<string | null>(null);
  const all = decisions.data ?? [];
  const pendingList = all.filter((d) => d.status === 'pending');
  const decidedList = all.filter((d) => d.status !== 'pending');
  const list = tab === 'pending' ? pendingList : decidedList;
  const current = list.find((d) => d.event_id === picked) ?? list[0];

  const tabBtn = (id: Tab, label: string, n: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => {
        setTab(id);
        setPicked(null);
      }}
      className={`flex-1 px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}
    >
      {label} <span className={tab === id ? 'text-paper/80' : 'text-ink-3'}>{n}</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Desk</h1>
        <p className="text-sm text-ink-3">{pendingList.length} waiting</p>
      </div>
      <p className="mt-1 max-w-[70ch] text-ink-2">
        First plans and change requests wait here. Accept an option to publish it to the traveller, or decline the request and the plan stays as it is.
      </p>

      <div className="mt-4">
        {(decisions.isLoading || fleet.isLoading) && <Loading label="Loading requests" />}
        {decisions.error && <ErrorNote>Requests could not be loaded.</ErrorNote>}
        {!decisions.isLoading && all.length === 0 && (
          <Empty title="Nothing to decide yet">First plans and traveller requests appear here as soon as they are ready.</Empty>
        )}

        {all.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
            <nav aria-label="Requests" className="self-start border border-rule bg-paper">
              <div role="tablist" className="flex divide-x divide-rule border-b-2 border-ink">
                {tabBtn('pending', 'Waiting', pendingList.length)}
                {tabBtn('decided', 'Decided', decidedList.length)}
              </div>
              {list.length === 0 ? (
                <p className="px-4 py-5 text-sm text-ink-2">{tab === 'pending' ? 'You are all caught up.' : 'No decisions yet.'}</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {list.map((d) => {
                    const active = d.event_id === current?.event_id;
                    const name = d.trip_name || d.trip_id;
                    return (
                      <li key={d.event_id}>
                        <button
                          type="button"
                          onClick={() => setPicked(d.event_id)}
                          aria-current={active ? 'true' : undefined}
                          className={`flex w-full items-center gap-3 p-2.5 text-left ${active ? 'bg-ink text-paper' : 'hover:bg-panel'}`}
                        >
                          <Photo photo={photoForTrip(name)} alt="" className="h-12 w-14 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{name}</span>
                            <span className={`line-clamp-2 text-xs ${active ? 'text-paper/80' : 'text-ink-3'}`}>
                              {d.kind === 'first_plan' ? 'First plan' : d.request || d.options.find((o) => !isKeep(o))?.summary || 'Change request'}
                            </span>
                            <span className={`block text-[11px] ${active ? 'text-paper/70' : 'text-ink-3'}`}>
                              {tab === 'pending' ? timeAgo(d.created_at) : `${STATE[d.status].label} ${timeAgo(d.decided_at)}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>
            {current ? <DecisionView
                key={current.event_id}
                decision={current}
                onDone={(id) => {
                  setTab('decided');
                  setPicked(id);
                }}
              /> : <Empty title="Choose a request">Pick one from the list.</Empty>}
          </div>
        )}
      </div>
    </div>
  );
}
