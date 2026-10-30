import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bed, Plane, Car, Ticket, Package } from 'lucide-react';
import { useAllBookings, useBookingActions, useTripBookings } from '../../hooks/usePhase3';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag, type Tone } from '../../ui/Tag';
import { tripPath } from '../../constants/routes';
import { formatMoney } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';
import type { Booking } from '../../services/phase3';

const KINDS: Array<{ id: Booking['kind']; label: string; Icon: typeof Bed }> = [
  { id: 'hotel', label: 'Hotel', Icon: Bed },
  { id: 'flight', label: 'Flight', Icon: Plane },
  { id: 'transport', label: 'Transport', Icon: Car },
  { id: 'activity', label: 'Tickets', Icon: Ticket },
  { id: 'other', label: 'Other', Icon: Package },
];
const STATUS: Record<Booking['status'], { tone: Tone; label: string }> = {
  requested: { tone: 'pending', label: 'Requested' },
  confirmed: { tone: 'added', label: 'Confirmed' },
  cancelled: { tone: 'removed', label: 'Cancelled' },
};

function KindIcon({ kind }: { kind: Booking['kind'] }) {
  const Icon = KINDS.find((k) => k.id === kind)?.Icon ?? Package;
  return <Icon size={16} aria-hidden className="text-ink-3" />;
}

function BookingTable({ rows, agent, showTrip }: { rows: Booking[]; agent: boolean; showTrip?: boolean }) {
  const { update, remove } = useBookingActions();
  return (
    <div className="overflow-x-auto">
      <table className="ruled min-w-[46rem]">
        <thead>
          <tr>
            <th>Booking</th>
            {showTrip && <th>Trip</th>}
            <th>Supplier</th>
            <th>Reference</th>
            <th className="num">Amount</th>
            <th>Status</th>
            {agent && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className={b.status === 'cancelled' ? 'text-ink-3' : ''}>
              <td>
                <span className="flex items-center gap-2 font-semibold">
                  <KindIcon kind={b.kind} />
                  <span className={b.status === 'cancelled' ? 'line-through' : ''}>{b.title}</span>
                </span>
                {b.notes && <span className="block pl-6 text-xs font-normal text-ink-3">{b.notes}</span>}
              </td>
              {showTrip && (
                <td>
                  <Link to={tripPath(b.trip_id)} className="underline underline-offset-4 decoration-1 hover:decoration-2">
                    {b.trip_name || b.trip_id}
                  </Link>
                </td>
              )}
              <td className="text-ink-2">{b.supplier || '—'}</td>
              <td className="tabular-nums">{b.reference || '—'}</td>
              <td className="num font-semibold">{formatMoney(b.amount)}</td>
              <td>
                <Tag tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Tag>
              </td>
              {agent && (
                <td className="whitespace-nowrap text-right">
                  {b.status === 'requested' && (
                    <Button variant="outline" onClick={() => update.mutate({ id: b.id, body: { status: 'confirmed' } })}>
                      Confirm
                    </Button>
                  )}{' '}
                  {b.status !== 'cancelled' && (
                    <Button variant="quiet" onClick={() => update.mutate({ id: b.id, body: { status: 'cancelled' } })}>
                      Cancel
                    </Button>
                  )}{' '}
                  <Button
                    variant="quiet"
                    onClick={() => {
                      if (window.confirm('Delete this booking record?')) remove.mutate(b.id);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddBooking({ tripId }: { tripId: string }) {
  const { create } = useBookingActions();
  const [kind, setKind] = useState<Booking['kind']>('hotel');
  const [title, setTitle] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<Booking['status']>('requested');
  const [touched, setTouched] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (title.trim().length < 2) return;
    create.mutate(
      { trip_id: tripId, kind, title: title.trim(), supplier: supplier.trim() || undefined, reference: reference.trim() || undefined, amount: Number(amount) || 0, status },
      {
        onSuccess: () => {
          setTitle('');
          setSupplier('');
          setReference('');
          setAmount('');
          setTouched(false);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border border-ink bg-paper p-4">
      <h3 className="title text-lg">Record a booking</h3>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kind">
        {KINDS.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className={`flex h-9 items-center gap-1.5 border px-3 text-sm font-semibold ${kind === id ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper hover:border-ink'}`}>
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <Input id="b-title" label="What was booked" value={title} onChange={(e) => setTitle(e.target.value)} error={touched && title.trim().length < 2 ? 'Describe the booking.' : ''} placeholder="Taj Palace, 2 nights" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input id="b-supplier" label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <Input id="b-ref" label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input id="b-amount" type="number" min={0} label="Amount (INR)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex divide-x divide-rule border border-ink" role="group" aria-label="Status">
          {(['requested', 'confirmed'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`h-10 px-4 text-sm font-semibold ${status === s ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}>
              {STATUS[s].label}
            </button>
          ))}
        </div>
        <Button type="submit" loading={create.isPending}>
          Add booking
        </Button>
      </div>
      {create.isError && <ErrorNote>That booking could not be saved.</ErrorNote>}
    </form>
  );
}

/** The bookings of one trip: the agent records them, the traveller reads them. */
export function TripBookingsPage() {
  const { tripId = '' } = useParams();
  const agent = useAuthStore((s) => s.user?.role === 'agent');
  const { data, isLoading, error } = useTripBookings(tripId);
  const rows = data?.bookings ?? [];
  const confirmed = rows.filter((b) => b.status === 'confirmed').reduce((n, b) => n + b.amount, 0);

  if (isLoading) return <Loading label="Loading bookings" />;
  if (error) return <ErrorNote>Bookings could not be loaded.</ErrorNote>;

  return (
    <div className={`grid gap-6 ${agent ? 'lg:grid-cols-[minmax(0,1fr)_26rem]' : ''}`}>
      <section className="min-w-0 self-start border border-rule bg-paper" aria-label="Bookings">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-2.5">
          <h2 className="title text-lg">Bookings</h2>
          <p className="text-sm text-ink-2">
            Confirmed <span className="font-bold tabular-nums">{formatMoney(confirmed)}</span>
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="p-3">
            <Empty title="No bookings yet">{agent ? 'Record hotels, flights and tickets as you book them. The traveller sees each one.' : 'Your travel agent records hotels, flights and tickets here as they are booked.'}</Empty>
          </div>
        ) : (
          <BookingTable rows={rows} agent={agent} />
        )}
      </section>
      {agent && <AddBooking tripId={tripId} />}
    </div>
  );
}

/** Every booking across trips, for the agent. */
export function BookingsPage() {
  useTitle('Bookings');
  const { data, isLoading, error } = useAllBookings();
  const [filter, setFilter] = useState<'all' | Booking['status']>('all');
  const rows = (data?.bookings ?? []).filter((b) => filter === 'all' || b.status === filter);
  const totals = data?.totals;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Bookings</h1>
        <p className="text-sm text-ink-3">{totals?.count ?? 0} records</p>
      </div>
      <dl className="mt-4 grid grid-cols-3 border border-ink bg-paper [&>div]:border-r [&>div]:border-rule [&>div]:p-3 [&>div:last-child]:border-r-0">
        <div className="bg-ink text-paper">
          <dt className="label !text-paper/80">Confirmed value</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums">{formatMoney(totals?.confirmed)}</dd>
        </div>
        <div>
          <dt className="label">Requested, not yet confirmed</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-ink-2">{formatMoney(totals?.requested)}</dd>
        </div>
        <div>
          <dt className="label">Records</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-ink-2">{totals?.count ?? 0}</dd>
        </div>
      </dl>
      <div className="mt-4 flex divide-x divide-rule border border-rule bg-paper text-sm sm:inline-flex" role="group" aria-label="Filter">
        {(['all', 'requested', 'confirmed', 'cancelled'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`flex-1 px-3 py-2 font-semibold capitalize ${filter === s ? 'bg-ink text-paper' : 'hover:bg-panel'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3 border border-rule bg-paper">
        {isLoading && <Loading label="Loading bookings" />}
        {error && (
          <div className="p-3">
            <ErrorNote>Bookings could not be loaded.</ErrorNote>
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="p-3">
            <Empty title="Nothing here">Open a trip and use its Bookings tab to record what you have booked.</Empty>
          </div>
        )}
        {rows.length > 0 && <BookingTable rows={rows} agent showTrip />}
      </div>
    </div>
  );
}
