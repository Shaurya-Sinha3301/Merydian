import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgentOptions, useApproveOption } from '../../hooks/useAgentJobs';
import { useTripPlan } from '../../hooks/useTripData';
import { useFleet } from '../../features/agent/useFleet';
import { TripMap } from '../../features/plan/TripMap';
import { Button } from '../../ui/Button';
import { Photo } from '../../ui/Photo';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag, type Tone } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { formatDateRange, formatMoney, formatSignedMoney, timeAgo } from '../../lib/format';
import { photoForTrip } from '../../lib/photos';
import { useTitle } from '../../lib/useTitle';
import type { AgentJobDTO, ItineraryOptionDTO } from '../../types/dto/agent';
import type { TripDetailResponse } from '../../types/dto/trip';

const STATUS: Record<ItineraryOptionDTO['status'], { tone: Tone; label: string }> = {
  PENDING: { tone: 'pending', label: 'Waiting for you' },
  APPROVED: { tone: 'added', label: 'Chosen' },
  REJECTED: { tone: 'removed', label: 'Not chosen' },
};

const ACTION_WORDS: Record<string, string> = {
  add_evening: 'Add in the evening',
  add: 'Add',
  remove: 'Drop',
  swap: 'Swap',
  split: 'Split the group',
};

function changesOf(option: ItineraryOptionDTO): Array<Record<string, unknown>> {
  return (option.details?.schedule_changes ?? []) as Array<Record<string, unknown>>;
}

function Decision({ job, trip, tripName }: { job: AgentJobDTO; trip?: TripDetailResponse; tripName: string }) {
  const eventId = String(job.result?.event_id);
  const { data, isLoading, error } = useAgentOptions(eventId);
  const approve = useApproveOption();
  const plan = useTripPlan(job.trip_id ?? '');
  const options = [...(data?.options ?? [])].sort((a, b) => changesOf(b).length - changesOf(a).length);
  const decided = options.some((o) => o.status !== 'PENDING');
  const request = typeof job.result?.summary === 'string' ? job.result.summary : undefined;

  // Every stop of the trip in day order, so the agent sees where the group will be
  const points = plan.days.flatMap((d) => d.stops.filter((s) => s.category !== 'meal').map((s) => ({ id: s.id, title: s.title })));
  const fitNow = trip?.total_satisfaction != null ? trip.total_satisfaction * 10 : null;

  return (
    <section aria-label={tripName} className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display text-2xl sm:text-3xl">{tripName}</h2>
          <p className="mt-1 text-sm text-ink-2">
            {formatDateRange(trip?.start_date, trip?.end_date)}
            {trip?.current_version ? ` · version ${trip.current_version}` : ''} · {formatMoney(trip?.total_cost)} now
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tag tone={decided ? 'added' : 'pending'}>{decided ? 'Decided' : 'Needs your decision'}</Tag>
          {job.trip_id && (
            <Link to={tripPath(job.trip_id)} className="text-sm font-semibold underline underline-offset-4">
              Open trip
            </Link>
          )}
        </div>
      </div>
      {request && <p className="mt-3 max-w-[72ch] border-l border-ink pl-3 text-ink-2">{request}</p>}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="border border-rule bg-paper">
          <h3 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Options against the current plan</h3>
          {isLoading && <Loading label="Loading the options" />}
          {error && (
            <div className="p-3">
              <ErrorNote>The options could not be loaded.</ErrorNote>
            </div>
          )}
          {options.length > 0 && (
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
                  {options.map((o) => {
                    const changes = changesOf(o);
                    const keeps = changes.length === 0;
                    const costDelta = trip?.total_cost != null ? o.cost - trip.total_cost : null;
                    const fit = Math.round(o.satisfaction * 100);
                    const fitDelta = fitNow != null ? Math.round(o.satisfaction * 100 - fitNow) : null;
                    const s = STATUS[o.status];
                    return (
                      <tr key={o.option_id} className="align-top">
                        <td className="max-w-[16rem]">
                          <p className="font-semibold">{keeps ? 'Keep the current plan' : o.summary}</p>
                          <p className="mt-1">
                            <Tag tone={s.tone}>{s.label}</Tag>
                          </p>
                        </td>
                        <td>
                          {keeps ? (
                            <span className="text-ink-2">Nothing. The request is set aside.</span>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {changes.map((c, i) => (
                                <li key={i} className="flex items-baseline gap-2 text-sm">
                                  <Tag tone="added">{ACTION_WORDS[String(c.action)] ?? 'Change'}</Tag>
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
                          {fitDelta != null && fitDelta !== 0 && (
                            <span className={`ml-1 text-xs ${fitDelta > 0 ? 'text-green' : 'text-magenta'}`}>
                              {fitDelta > 0 ? '+' : ''}
                              {fitDelta}
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          {o.status === 'PENDING' && (
                            <Button
                              variant={keeps ? 'outline' : 'cyan'}
                              loading={approve.isPending && approve.variables === o.option_id}
                              onClick={() => approve.mutate(o.option_id)}
                            >
                              {keeps ? 'Keep' : 'Approve'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {approve.isError && (
            <div className="p-3">
              <ErrorNote>That did not go through. Please try again.</ErrorNote>
            </div>
          )}
          {approve.isSuccess && (
            <p className="border-t border-rule px-4 py-3 text-sm font-semibold text-green">
              Saved. The tools and communication agents have been queued.
            </p>
          )}
        </div>

        <TripMap
          label={`Stops of ${tripName}`}
          points={points}
          className="h-80 border border-rule"
        />
      </div>
    </section>
  );
}

export function DeskPage() {
  useTitle('Desk');
  const fleet = useFleet();
  const [picked, setPicked] = useState<string | null>(null);
  const waiting = fleet.waitingJobs;
  const tripOf = (id?: string | null) => fleet.items.find((t) => t.trip_id === id);
  const current = waiting.find((j) => j.job_id === picked) ?? waiting[0];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Desk</h1>
        <p className="text-sm text-ink-3">{waiting.length} waiting</p>
      </div>
      <p className="mt-1 max-w-[70ch] text-ink-2">
        When a traveller asks for something, the AI prepares options. Compare each against the current plan and choose one.
      </p>

      <div className="mt-4">
        {fleet.isLoading && <Loading label="Loading requests" />}
        {fleet.error && <ErrorNote>Requests could not be loaded.</ErrorNote>}
        {!fleet.isLoading && waiting.length === 0 && (
          <Empty title="You are all caught up">New requests appear here as soon as the agents finish preparing options.</Empty>
        )}

        {waiting.length > 0 && current && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <nav aria-label="Requests" className="self-start border border-rule bg-paper">
              <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Requests</h2>
              <ul className="divide-y divide-rule">
                {waiting.map((j) => {
                  const active = j.job_id === current.job_id;
                  const name = fleet.nameOf(j.trip_id);
                  return (
                    <li key={j.job_id}>
                      <button
                        type="button"
                        onClick={() => setPicked(j.job_id)}
                        aria-current={active ? 'true' : undefined}
                        className={`flex w-full items-center gap-3 p-2.5 text-left ${active ? 'bg-ink text-paper' : 'hover:bg-panel'}`}
                      >
                        <Photo photo={photoForTrip(name)} alt="" className="h-12 w-14 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{name}</span>
                          <span className={`line-clamp-2 text-xs ${active ? 'text-paper/80' : 'text-ink-3'}`}>
                            {typeof j.result?.summary === 'string' ? j.result.summary : 'New request'}
                          </span>
                          <span className={`block text-[11px] ${active ? 'text-paper/70' : 'text-ink-3'}`}>{timeAgo(j.updated_at)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <Decision key={current.job_id} job={current} trip={tripOf(current.trip_id)} tripName={fleet.nameOf(current.trip_id)} />
          </div>
        )}
      </div>
    </div>
  );
}
