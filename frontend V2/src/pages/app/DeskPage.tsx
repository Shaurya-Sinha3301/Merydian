import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgentJobs, useAgentOptions, useApproveOption } from '../../hooks/useAgentJobs';
import { useTrips } from '../../hooks/useTrips';
import { Button } from '../../ui/Button';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag, toneBg, type Tone } from '../../ui/Tag';
import { Photo } from '../../ui/Photo';
import { photoForTrip } from '../../lib/photos';
import { tripPath } from '../../constants/routes';
import { formatMoney, formatSignedMoney } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';
import type { AgentJobDTO, ItineraryOptionDTO } from '../../types/dto/agent';
import type { TripDetailResponse } from '../../types/dto/trip';

const STATUS: Record<ItineraryOptionDTO['status'], { tone: Tone; label: string; text: string }> = {
  PENDING: { tone: 'pending', label: 'Waiting for you', text: 'text-ink' },
  APPROVED: { tone: 'added', label: 'Chosen', text: 'text-ink' },
  REJECTED: { tone: 'removed', label: 'Not chosen', text: 'text-paper' },
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

function OptionColumn({
  option,
  trip,
  onChoose,
  busy,
}: {
  option: ItineraryOptionDTO;
  trip?: TripDetailResponse;
  onChoose: () => void;
  busy: boolean;
}) {
  const s = STATUS[option.status];
  const changes = changesOf(option);
  const keeps = changes.length === 0;
  const costDelta = trip?.total_cost != null ? option.cost - trip.total_cost : null;
  const fitNow = trip?.total_satisfaction != null ? trip.total_satisfaction * 10 : null;
  const fitDelta = fitNow != null ? Math.round(option.satisfaction * 100 - fitNow) : null;

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow-card)]">
      <div className={`px-4 py-1.5 text-sm font-extrabold ${toneBg[s.tone]} ${s.text}`}>{s.label}</div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <h4 className="title text-2xl">{keeps ? 'Keep the current plan' : option.summary}</h4>

        <div>
          <p className="label">What changes</p>
          {keeps ? (
            <p className="mt-1 text-ink-2">Nothing. The request is set aside for now.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1.5">
              {changes.map((c, i) => {
                const action = ACTION_WORDS[String(c.action)] ?? 'Change';
                const what = String(c.poi_name ?? c.add ?? c.remove ?? '');
                return (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-green px-2 text-xs font-bold">{action}</span>
                    <span className="font-bold">
                      {c.day ? `Day ${String(c.day)}: ` : ''}
                      {what}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t border-rule pt-3">
          <div>
            <dt className="label">Plan cost</dt>
            <dd className="text-xl font-extrabold">{formatMoney(option.cost)}</dd>
            <dd className="text-sm text-ink-2">
              {costDelta == null ? '' : costDelta === 0 ? 'Same as now' : `${formatSignedMoney(costDelta)} vs now`}
            </dd>
          </div>
          <div>
            <dt className="label">Predicted fit</dt>
            <dd className="text-xl font-extrabold">{Math.round(option.satisfaction * 100)}%</dd>
            <dd className="text-sm text-ink-2">
              {fitDelta == null ? '' : fitDelta === 0 ? 'Same as now' : `${fitDelta > 0 ? '+' : ''}${fitDelta} points vs now`}
            </dd>
          </div>
        </dl>

        {option.status === 'PENDING' && (
          <div className="mt-auto pt-1">
            {keeps ? (
              <Button variant="outline" loading={busy} onClick={onChoose}>
                Keep the current plan
              </Button>
            ) : (
              <Button variant="cyan" loading={busy} onClick={onChoose}>
                Approve this option
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Decision({ job, trip, tripName }: { job: AgentJobDTO; trip?: TripDetailResponse; tripName: string }) {
  const eventId = String(job.result?.event_id);
  const { data, isLoading, error } = useAgentOptions(eventId);
  const approve = useApproveOption();
  const options = [...(data?.options ?? [])].sort((a, b) => changesOf(b).length - changesOf(a).length);
  const decided = options.some((o) => o.status !== 'PENDING');
  const request = typeof job.result?.summary === 'string' ? job.result.summary : undefined;

  return (
    <section aria-label={tripName}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="display text-4xl sm:text-5xl">{tripName}</h2>
        <div className="flex items-center gap-4">
          <Tag tone={decided ? 'added' : 'pending'}>{decided ? 'Decided' : 'Needs your decision'}</Tag>
          {job.trip_id && (
            <Link to={tripPath(job.trip_id)} className="text-sm font-bold underline underline-offset-4 decoration-2">
              Open trip
            </Link>
          )}
        </div>
      </div>
      {request && <p className="mt-2 max-w-[70ch] text-ink-2">{request}</p>}

      {isLoading && <Loading label="Loading the options" />}
      {error && (
        <div className="mt-3">
          <ErrorNote>The options could not be loaded.</ErrorNote>
        </div>
      )}

      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {options.map((o) => (
          <OptionColumn
            key={o.option_id}
            option={o}
            trip={trip}
            busy={approve.isPending && approve.variables === o.option_id}
            onChoose={() => approve.mutate(o.option_id)}
          />
        ))}
      </ul>
      {approve.isError && (
        <div className="mt-3">
          <ErrorNote>That did not go through. Please try again.</ErrorNote>
        </div>
      )}
      {approve.isSuccess && (
        <p className="mt-3 text-sm font-bold">Saved. The tools and communication agents have been queued.</p>
      )}
    </section>
  );
}

export function DeskPage() {
  useTitle('Desk');
  const jobs = useAgentJobs(100, 0);
  const trips = useTrips(100, 0);
  const [picked, setPicked] = useState<string | null>(null);
  const all: AgentJobDTO[] = jobs.data?.jobs ?? [];
  const waiting = all.filter((j) => j.result?.awaiting_approval === true && typeof j.result?.event_id === 'string');
  const tripOf = (id?: string | null) => trips.data?.items.find((t) => t.trip_id === id);
  const nameOf = (id?: string | null) => tripOf(id)?.trip_name || id || 'Trip';
  const current = waiting.find((j) => j.job_id === picked) ?? waiting[0];

  return (
    <div>
      <h1 className="display text-[2.8rem] sm:text-[4.2rem]">
        {waiting.length > 0 ? (
          <>
            <span className="mark mark-yellow">{waiting.length}</span> waiting on you
          </>
        ) : (
          'Nothing waiting'
        )}
        .
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-2">
        When a traveller asks for something, the AI prepares options. Compare each against the current plan and choose one.
      </p>

      <div className="mt-10">
        {jobs.isLoading && <Loading label="Loading requests" />}
        {jobs.error && <ErrorNote>Requests could not be loaded.</ErrorNote>}
        {!jobs.isLoading && waiting.length === 0 && (
          <Empty title="You are all caught up">New requests appear here as soon as the agents finish preparing options.</Empty>
        )}

        {waiting.length > 0 && current && (
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
            <nav aria-label="Requests" className="lg:col-span-4">
              <h2 className="title text-2xl">Requests</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {waiting.map((j) => {
                  const active = j.job_id === current.job_id;
                  return (
                    <li key={j.job_id}>
                      <button
                        type="button"
                        onClick={() => setPicked(j.job_id)}
                        aria-current={active ? 'true' : undefined}
                        className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left shadow-[var(--shadow-card)] ${active ? 'bg-ink text-paper' : 'bg-paper hover:bg-yellow'}`}
                      >
                        <Photo photo={photoForTrip(nameOf(j.trip_id))} alt="" className="h-14 w-16 shrink-0 rounded-xl" />
                        <span className="min-w-0">
                          <span className="block text-base font-extrabold">{nameOf(j.trip_id)}</span>
                          <span className={`line-clamp-2 text-sm ${active ? 'text-paper' : 'text-ink-2'}`}>
                            {typeof j.result?.summary === 'string' ? j.result.summary : 'New request'}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="lg:col-span-8">
              <Decision key={current.job_id} job={current} trip={tripOf(current.trip_id)} tripName={nameOf(current.trip_id)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
