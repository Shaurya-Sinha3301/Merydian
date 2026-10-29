import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateTrip, useCustomers, useRequestTrip } from '../../hooks/useCustomers';
import { useApproveOption } from '../../hooks/useAgentJobs';
import { useAuthStore } from '../../stores/auth.store';
import { Button, ButtonLink } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { ErrorNote, Loading } from '../../ui/Surface';
import { ROUTES, tripPath } from '../../constants/routes';
import { formatMoney } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';

const INTERESTS = ['history', 'architecture', 'food', 'nature', 'shopping', 'nightlife', 'religious'] as const;
const PACE = [
  { id: 'relaxed', label: 'Relaxed', energy: 0.3 },
  { id: 'moderate', label: 'Balanced', energy: 0.5 },
  { id: 'fast', label: 'Packed', energy: 0.8 },
] as const;
const BUDGET = [
  { id: 'tight', label: 'Tight', value: 0.8 },
  { id: 'mid', label: 'Comfortable', value: 0.5 },
  { id: 'open', label: 'Open', value: 0.2 },
] as const;

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-bold">{label}</legend>
      <div className="flex divide-x divide-rule border border-ink">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`h-11 flex-1 px-3 text-sm font-semibold ${value === o.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function messageOf(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.detail || e.message || 'Something went wrong.';
}

export function NewTripPage() {
  useTitle('Plan a trip');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isAgent = useAuthStore((s) => s.user?.role === 'agent');
  const customers = useCustomers();
  const requestTrip = useRequestTrip();
  const createTrip = useCreateTrip();
  const approve = useApproveOption();

  const [name, setName] = useState('');
  const [start, setStart] = useState(isoDay(14));
  const [end, setEnd] = useState(isoDay(16));
  const [members, setMembers] = useState(2);
  const [children, setChildren] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set(['history', 'food']));
  const [pace, setPace] = useState<(typeof PACE)[number]['id']>('moderate');
  const [budget, setBudget] = useState<(typeof BUDGET)[number]['id']>('mid');
  const [customer, setCustomer] = useState(params.get('customer') ?? '');
  const [touched, setTouched] = useState(false);

  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
  const errors = {
    name: name.trim().length < 2 ? 'Give the trip a name.' : '',
    dates: !(days >= 1) ? 'The trip must end on or after it starts.' : days > 10 ? 'Trips are limited to 10 days.' : '',
    customer: isAgent && !customer ? 'Choose the customer this trip is for.' : '',
  };
  const valid = !errors.name && !errors.dates && !errors.customer;
  const busy = requestTrip.isPending || createTrip.isPending;

  const toggle = (k: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    if (isAgent) {
      createTrip.mutate({
        trip_name: name.trim(),
        destination: 'Delhi, India',
        start_date: start,
        end_date: end,
        family_ids: [customer],
        num_travellers: (customers.data?.find((c) => c.family_code === customer)?.members ?? 2),
      });
      return;
    }
    requestTrip.mutate(
      {
        trip_name: name.trim(),
        destination: 'Delhi, India',
        start_date: start,
        end_date: end,
        members,
        children: Math.min(children, members),
        interests: Object.fromEntries(INTERESTS.map((k) => [k, picked.has(k) ? 0.9 : 0.3])),
        pace,
        budget_sensitivity: BUDGET.find((b) => b.id === budget)!.value,
        energy_level: PACE.find((p) => p.id === pace)!.energy,
      },
      { onSuccess: (r) => navigate(tripPath(r.trip_id), { replace: true }) },
    );
  };

  // An agent's new trip waits here for the first approval
  const made = createTrip.data;
  if (isAgent && made) {
    return (
      <div className="max-w-2xl">
        <h1 className="display text-3xl sm:text-4xl">First plan ready</h1>
        <p className="mt-2 text-ink-2">{made.optimizer_ran ? 'The optimizer built this plan.' : 'The optimizer was unavailable, so this is the baseline plan.'}</p>
        <dl className="mt-4 grid grid-cols-3 border border-ink bg-paper text-center [&>div]:p-4 [&>div]:border-r [&>div:last-child]:border-r-0 [&>div]:border-rule">
          <div>
            <dt className="label">Days</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{made.summary.trip_duration_days ?? '—'}</dd>
          </div>
          <div>
            <dt className="label">Estimated cost</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(made.summary.estimated_cost)}</dd>
          </div>
          <div>
            <dt className="label">Predicted fit</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {made.summary.predicted_satisfaction != null ? `${Math.round(made.summary.predicted_satisfaction * 100)}%` : '—'}
            </dd>
          </div>
        </dl>
        {approve.isSuccess ? (
          <p className="mt-4 font-semibold text-green">Approved. The family can now read the plan and send feedback.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="cyan" loading={approve.isPending} onClick={() => approve.mutate(made.option_id)}>
              Approve and publish
            </Button>
            <p className="text-sm text-ink-3">Nothing reaches the family until you approve it.</p>
          </div>
        )}
        {approve.isError && (
          <div className="mt-3">
            <ErrorNote>That did not go through. Please try again.</ErrorNote>
          </div>
        )}
        <div className="mt-6 flex gap-4 text-sm font-semibold">
          <Link to={tripPath(made.trip_id)} className="underline underline-offset-4">
            Open the trip
          </Link>
          <Link to={ROUTES.CUSTOMERS} className="underline underline-offset-4">
            Back to customers
          </Link>
        </div>
      </div>
    );
  }

  const failure = requestTrip.error ?? createTrip.error;

  return (
    <div className="max-w-3xl">
      <h1 className="display text-3xl sm:text-4xl">{isAgent ? 'Plan a trip for a customer' : 'Plan a trip'}</h1>
      <p className="mt-2 max-w-[62ch] text-ink-2">
        {isAgent
          ? "Pick the customer and the dates. The optimizer builds a first plan from the customer's saved preferences, and you approve it before they see it."
          : 'Tell us who is travelling and what you enjoy. We build a Delhi plan for those dates, and you can ask for changes in plain words afterwards.'}
      </p>

      {busy && (
        <div className="mt-6 border border-rule bg-paper p-4" role="status">
          <Loading label="Building the plan. This can take up to a minute." />
        </div>
      )}

      <form onSubmit={submit} noValidate className={`mt-6 flex flex-col gap-6 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
        {isAgent && (
          <div>
            <label htmlFor="customer" className="text-sm font-bold">
              Customer
            </label>
            <select
              id="customer"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-sm border border-ink bg-paper px-3"
            >
              <option value="">Choose a customer</option>
              {customers.data?.map((c) => (
                <option key={c.user_id} value={c.family_code ?? ''} disabled={!c.family_code}>
                  {c.full_name || c.email} ({c.email})
                </option>
              ))}
            </select>
            {touched && errors.customer && <p className="mt-1 text-xs font-bold text-magenta">{errors.customer}</p>}
          </div>
        )}

        <Input id="trip-name" label="Trip name" value={name} onChange={(e) => setName(e.target.value)} error={touched ? errors.name : ''} placeholder="Delhi long weekend" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="start" type="date" label="First day" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input id="end" type="date" label="Last day" value={end} onChange={(e) => setEnd(e.target.value)} error={touched ? errors.dates : ''} hint={days >= 1 ? `${days} day${days === 1 ? '' : 's'}` : undefined} />
        </div>

        {!isAgent && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="members" type="number" min={1} max={20} label="Travellers" value={members} onChange={(e) => setMembers(Math.max(1, Number(e.target.value) || 1))} />
              <Input id="children" type="number" min={0} max={20} label="Of them children" value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-bold">What you most enjoy</legend>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={picked.has(k)}
                    onClick={() => toggle(k)}
                    className={`h-10 border px-4 text-sm font-semibold capitalize ${picked.has(k) ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper hover:border-ink'}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Segmented label="Pace" value={pace} options={PACE} onChange={setPace} />
              <Segmented label="Budget" value={budget} options={BUDGET} onChange={setBudget} />
            </div>
          </>
        )}

        {failure && <ErrorNote>{messageOf(failure)}</ErrorNote>}

        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" type="submit" loading={busy}>
            {isAgent ? 'Build the first plan' : 'Build my plan'}
          </Button>
          <ButtonLink to={isAgent ? ROUTES.CUSTOMERS : ROUTES.APP} variant="quiet">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
