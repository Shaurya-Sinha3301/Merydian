import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTripSummary } from '../../hooks/useTrips';
import { useJobProgress, useSendFeedback } from '../../hooks/useTripData';
import { Button, ButtonLink } from '../../ui/Button';
import { TextArea } from '../../ui/Field';
import { ErrorNote } from '../../ui/Surface';
import { changesPath } from '../../constants/routes';
import { timeAgo } from '../../lib/format';

const IDEAS = [
  'Add more outdoor time and fewer museums',
  'Keep it cheaper: free or low-cost places only',
  'Lighter days, with fewer long walks',
  'More food and markets',
];

const STAGES = ['Reading your message', 'Updating the constraints', 'Re-planning the days', 'Writing the reasons'];

function jobKey(tripId: string) {
  return `merydian-job-${tripId}`;
}

function readJob(tripId: string): string | undefined {
  try {
    return sessionStorage.getItem(jobKey(tripId)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Four bars: done, in progress, waiting. */
function Stages({ progress, failed, idle }: { progress: number; failed: boolean; idle?: boolean }) {
  const active = idle ? -1 : Math.min(STAGES.length - 1, Math.floor(progress / 25));
  const done = progress >= 100;
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {STAGES.map((label, i) => {
        const state = done || i < active ? 'done' : i === active ? (failed ? 'failed' : 'active') : 'wait';
        const bar =
          state === 'done' ? 'bg-green' : state === 'active' ? 'bg-cyan animate-pulse' : state === 'failed' ? 'bg-magenta' : 'bg-rule';
        return (
          <li key={label}>
            <div className={`h-3 ${bar}`} />
            <p className={`mt-2 text-sm font-bold ${state === 'wait' ? 'text-ink-3' : ''}`}>{label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function FeedbackPage() {
  const { tripId = '' } = useParams();
  const { data: trip } = useTripSummary(tripId);
  const [message, setMessage] = useState('');
  const [jobId, setJobId] = useState<string | undefined>(() => readJob(tripId));
  const send = useSendFeedback(tripId);
  const job = useJobProgress(jobId, tripId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send.mutate(message.trim(), {
      onSuccess: (res) => {
        setJobId(res.job_id);
        try {
          sessionStorage.setItem(jobKey(tripId), res.job_id);
        } catch {
          /* storage can be blocked; the screen still works without it */
        }
        setMessage('');
      },
    });
  };

  const status = job.data?.status;
  const newPlan = status === 'COMPLETED' && job.data?.result_available === true;
  const savedOnly = status === 'COMPLETED' && job.data?.result_available === false;
  const running = !!jobId && status !== 'COMPLETED' && status !== 'FAILED';
  const history = [...(trip?.feedback_history ?? [])].reverse();

  return (
    <div className="grid gap-x-12 gap-y-12 lg:grid-cols-12">
      <section className="lg:col-span-6" aria-labelledby="ask">
        <h2 id="ask" className="display text-4xl sm:text-5xl">
          What would you <span className="mark mark-cyan">change</span>?
        </h2>
        <p className="mt-4 max-w-[48ch] text-ink-2">
          Write it in plain words. An AI agent turns it into constraints, the optimizer re-plans, and a travel agent
          reviews the result.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <TextArea
            id="feedback"
            label="Your message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="The kids are getting restless with museums. Can we swap in something outdoors?"
            disabled={running}
          />
          <div className="flex flex-wrap gap-2" aria-label="Ideas">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                disabled={running}
                onClick={() => setMessage(idea)}
                className="rounded-full bg-paper px-3.5 py-1.5 text-sm font-bold shadow-[var(--shadow-card)] hover:bg-yellow disabled:opacity-45"
              >
                {idea}
              </button>
            ))}
          </div>
          {send.isError && <ErrorNote>The message could not be sent. Please try again.</ErrorNote>}
          <div>
            <Button size="lg" type="submit" loading={send.isPending} disabled={running || message.trim().length < 3}>
              Send to the planner
            </Button>
          </div>
        </form>
      </section>

      <section className="lg:col-span-6" aria-labelledby="progress" aria-live="polite">
        <h2 id="progress" className="title text-3xl sm:text-4xl">
          {!jobId ? 'The plan will update here' : newPlan ? 'New plan ready' : savedOnly ? 'Saved, no plan change' : status === 'FAILED' ? 'No new plan' : 'Re-planning now'}
        </h2>

        {!jobId && (
          <div className="mt-5">
            <Stages progress={0} failed={false} idle />
            <p className="mt-4 max-w-[46ch] text-ink-2">
              When you send a message you can watch each step, from reading it to writing the reasons.
            </p>
          </div>
        )}

        {jobId && (
          <div className="mt-5">
            <Stages progress={job.data?.progress_percentage ?? 5} failed={status === 'FAILED'} />
            <p className="mt-4 text-ink-2">{job.data?.description ?? 'Starting'}</p>
            {newPlan && (
              <div className="mt-5">
                <ButtonLink to={changesPath(tripId)} variant="cyan" size="lg">
                  See what changed and why
                </ButtonLink>
              </div>
            )}
            {status === 'FAILED' && (
              <div className="mt-4">
                <ErrorNote>{job.data?.description || 'Something went wrong. Try rephrasing your message.'}</ErrorNote>
              </div>
            )}
          </div>
        )}

        <h3 className="title mt-12 text-2xl">Earlier feedback</h3>
        {history.length === 0 ? (
          <p className="mt-3 text-ink-2">Nothing yet for this trip.</p>
        ) : (
          <ul className="mt-2">
            {history.map((h, i) => (
              <li key={i} className="border-t border-rule py-3">
                <p className="font-bold">{h.message}</p>
                <p className="mt-0.5 text-sm text-ink-3">{h.timestamp ? timeAgo(h.timestamp) : `Round ${h.iteration ?? i + 1}`}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
