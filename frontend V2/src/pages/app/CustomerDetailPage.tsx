import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { phase4Service } from '../../services/phase4';
import { Link, useParams } from 'react-router-dom';
import { useCustomer, useSavePreferences } from '../../hooks/useCustomers';
import type { CustomerDetail } from '../../services/customers';
import { Button, ButtonLink } from '../../ui/Button';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { ROUTES, tripPath } from '../../constants/routes';
import { formatDateRange, formatMoney } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';

const INTERESTS = ['history', 'architecture', 'culture', 'food', 'nature', 'adventure', 'shopping', 'nightlife', 'religious'];
const PACE = [
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'moderate', label: 'Balanced' },
  { id: 'fast', label: 'Packed' },
];

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
      <span className="font-semibold capitalize">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-2 w-full cursor-pointer accent-[var(--color-cyan)]"
      />
      <span className="text-right tabular-nums text-ink-2">{Math.round(value * 100)}%</span>
    </label>
  );
}

export function CustomerDetailPage() {
  const { familyId = '' } = useParams();
  const { data, isLoading, error } = useCustomer(familyId);
  useTitle(data?.full_name || 'Customer');

  if (isLoading) return <Loading label="Loading the customer" />;
  if (error || !data) {
    return (
      <Empty title="We could not open that customer" action={<ButtonLink to={ROUTES.CUSTOMERS}>Back to customers</ButtonLink>}>
        They may have been removed, or the server is still waking up.
      </Empty>
    );
  }
  return <CustomerView key={data.family_id} data={data} familyId={familyId} />;
}

function CustomerView({ data, familyId }: { data: CustomerDetail; familyId: string }) {
  const save = useSavePreferences(familyId);
  const invite = useMutation({ mutationFn: () => phase4Service.resendInvite(familyId) });
  const p = data.preferences;
  const [members, setMembers] = useState(p.members ?? 2);
  const [children, setChildren] = useState(p.children ?? 0);
  const [interests, setInterests] = useState<Record<string, number>>(p.interest_vector ?? {});
  const [pace, setPace] = useState(p.pace_preference ?? 'moderate');
  const [budget, setBudget] = useState(p.budget_sensitivity ?? 0.5);
  const [energy, setEnergy] = useState(p.energy_level ?? 0.5);
  const [dirty, setDirty] = useState(false);

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  const submit = () =>
    save.mutate({
      members,
      children: Math.min(children, members),
      interest_vector: Object.fromEntries(INTERESTS.map((k) => [k, interests[k] ?? 0.5])),
      pace_preference: pace,
      budget_sensitivity: budget,
      energy_level: energy,
    }, { onSuccess: () => setDirty(false) });

  return (
    <div>
      <Link to={ROUTES.CUSTOMERS} className="mb-3 inline-block text-sm font-semibold underline underline-offset-4">
        All customers
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl sm:text-4xl">{data.full_name || data.email}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {data.email} · family code <span className="tabular-nums">{data.family_code}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" loading={invite.isPending} onClick={() => invite.mutate()}>
            Email an invitation again
          </Button>
          <ButtonLink to={`${ROUTES.NEW_TRIP}?customer=${encodeURIComponent(data.family_code)}`}>Plan a trip</ButtonLink>
        </div>
      </div>

      {invite.isSuccess && (
        <p className="mt-3 border border-green bg-green-tint px-3 py-2 text-sm" role="status">
          <span className="font-semibold">Invitation sent.</span>{' '}
          {invite.data.email_configured ? 'It is on its way.' : 'Email is not set up on this server, so send them this link yourself:'}{' '}
          {!invite.data.email_configured && <span className="select-all break-all font-mono text-xs">{invite.data.invite_link}</span>}
        </p>
      )}
      {invite.isError && <div className="mt-3"><ErrorNote>The invitation could not be sent.</ErrorNote></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 border border-rule bg-paper" aria-labelledby="prefs">
          <h2 id="prefs" className="title border-b-2 border-ink px-4 py-2.5 text-lg">
            Saved preferences
          </h2>
          <div className="grid gap-6 p-4 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="label">Interests</p>
              {INTERESTS.map((k) => (
                <Slider key={k} label={k} value={interests[k] ?? 0.5} onChange={touch((v: number) => setInterests((s) => ({ ...s, [k]: v })))} />
              ))}
            </div>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">
                  Travellers
                  <input type="number" min={1} max={20} value={members} onChange={(e) => touch(setMembers)(Math.max(1, Number(e.target.value) || 1))} className="mt-1.5 h-11 w-full rounded-sm border border-ink bg-paper px-3 text-base font-normal" />
                </label>
                <label className="text-sm font-bold">
                  Children
                  <input type="number" min={0} max={20} value={children} onChange={(e) => touch(setChildren)(Math.max(0, Number(e.target.value) || 0))} className="mt-1.5 h-11 w-full rounded-sm border border-ink bg-paper px-3 text-base font-normal" />
                </label>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-sm font-bold">Pace</legend>
                <div className="flex divide-x divide-rule border border-ink">
                  {PACE.map((o) => (
                    <button key={o.id} type="button" aria-pressed={pace === o.id} onClick={() => touch(setPace)(o.id)} className={`h-10 flex-1 text-sm font-semibold ${pace === o.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Slider label="Budget care" value={budget} onChange={touch(setBudget)} />
              <Slider label="Energy" value={energy} onChange={touch(setEnergy)} />
              <p className="text-xs text-ink-3">Changes apply to trips planned from now on. Existing plans are not re-run.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-rule px-4 py-3">
            <Button onClick={submit} loading={save.isPending} disabled={!dirty}>
              Save preferences
            </Button>
            {save.isSuccess && !dirty && <p className="text-sm font-semibold text-green">Saved.</p>}
            {save.isError && <ErrorNote>The preferences could not be saved.</ErrorNote>}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="border border-rule bg-paper" aria-labelledby="trips">
            <h2 id="trips" className="title border-b-2 border-ink px-4 py-2.5 text-lg">
              Trips
            </h2>
            {data.trips.length === 0 ? (
              <p className="px-4 py-5 text-sm text-ink-2">No trips yet. Plan the first one.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {data.trips.map((t) => (
                  <li key={t.trip_id} className="px-4 py-3">
                    <Link to={tripPath(t.trip_id)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                      {t.trip_name || 'Untitled trip'}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-2">{formatDateRange(t.start_date, t.end_date)}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      {t.current_version ? <Tag tone="ai">v{t.current_version}</Tag> : <Tag tone="pending">Not approved</Tag>}
                      <span className="tabular-nums">{formatMoney(t.total_cost)}</span>
                      <span className="text-ink-3">{t.feedback_count} feedback</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-rule bg-paper" aria-labelledby="who">
            <h2 id="who" className="title border-b-2 border-ink px-4 py-2.5 text-lg">
              People on this account
            </h2>
            <ul className="divide-y divide-rule">
              {data.members.map((m) => (
                <li key={m.id} className="px-4 py-2.5 text-sm">
                  <p className="font-semibold">{m.full_name || m.email}</p>
                  <p className="text-ink-3">{m.email}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
