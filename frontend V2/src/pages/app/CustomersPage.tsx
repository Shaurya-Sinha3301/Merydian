import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCreateCustomer, useCustomers } from '../../hooks/useCustomers';
import { Button, ButtonLink } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { Empty, ErrorNote, ExportButton, Loading } from '../../ui/Surface';
import { downloadCsv } from '../../lib/exporters';
import { customerPath, ROUTES } from '../../constants/routes';
import { useTitle } from '../../lib/useTitle';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomersPage() {
  useTitle('Customers');
  const customers = useCustomers();
  const create = useCreateCustomer();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [members, setMembers] = useState(2);
  const [children, setChildren] = useState(0);
  const [touched, setTouched] = useState(false);

  const emailError = EMAIL.test(email.trim()) ? '' : 'Enter a valid email address.';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (emailError) return;
    create.mutate(
      { email: email.trim(), full_name: name.trim(), members, children: Math.min(children, members) },
      {
        onSuccess: () => {
          setTouched(false);
          setEmail('');
          setName('');
        },
      },
    );
  };

  const created = create.data;
  const rows = customers.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Customers</h1>
        <p className="flex items-center gap-3 text-sm text-ink-3">
          {rows.length} accounts
          <ExportButton onClick={() => downloadCsv('customers.csv', ['Name', 'Email', 'Family code', 'Travellers', 'Children', 'Trips'], rows.map((c) => [c.full_name, c.email, c.family_code, c.members, c.children, c.trip_count]))} />
        </p>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 border border-rule bg-paper" aria-label="Customers">
          {customers.isLoading && <Loading label="Loading customers" />}
          {customers.error && (
            <div className="p-3">
              <ErrorNote>Customers could not be loaded.</ErrorNote>
            </div>
          )}
          {!customers.isLoading && rows.length === 0 && (
            <div className="p-3">
              <Empty title="No customers yet">Add the first one with the form. They get a temporary password to sign in with.</Empty>
            </div>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="ruled min-w-[40rem]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Family code</th>
                    <th className="num">Party</th>
                    <th className="num">Trips</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.user_id}>
                      <td>
                        {c.family_id ? (
                          <Link to={customerPath(c.family_id)} className="font-semibold underline underline-offset-4 decoration-1 hover:decoration-2">
                            {c.full_name || c.email}
                          </Link>
                        ) : (
                          <p className="font-semibold">{c.full_name || c.email}</p>
                        )}
                        <p className="text-xs text-ink-3">{c.email}</p>
                      </td>
                      <td className="tabular-nums text-ink-2">{c.family_code ?? '—'}</td>
                      <td className="num">
                        {c.members}
                        {c.children ? <span className="text-ink-3"> ({c.children} children)</span> : null}
                      </td>
                      <td className="num">{c.trip_count}</td>
                      <td className="text-right">
                        {c.family_code && (
                          <ButtonLink to={`${ROUTES.NEW_TRIP}?customer=${encodeURIComponent(c.family_code)}`} variant="outline">
                            Plan a trip
                          </ButtonLink>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="self-start">
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 border border-ink bg-paper p-4">
            <h2 className="title text-lg">Add a customer</h2>
            <Input id="c-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={touched ? emailError : ''} autoComplete="off" />
            <Input id="c-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            <div className="grid grid-cols-2 gap-3">
              <Input id="c-members" type="number" min={1} max={20} label="Travellers" value={members} onChange={(e) => setMembers(Math.max(1, Number(e.target.value) || 1))} />
              <Input id="c-children" type="number" min={0} max={20} label="Children" value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            {create.isError && <ErrorNote>That customer could not be added.</ErrorNote>}
            <Button type="submit" loading={create.isPending}>
              Add customer
            </Button>
          </form>

          {created && (
            <div className="mt-4 border border-green bg-green-tint p-4 text-sm" role="status">
              <p className="font-bold">{created.message}</p>
              {created.invite_link ? (
                <>
                  <p className="mt-2 text-ink-2">We emailed them an invitation to choose a password. If email is not set up here, send them this link yourself. It works once and lasts a week.</p>
                  <p className="mt-1 select-all break-all border border-rule bg-paper px-2 py-1.5 font-mono text-xs">{created.invite_link}</p>
                </>
              ) : (
                <p className="mt-2 text-ink-2">This email already had an account, so nothing was changed.</p>
              )}
              <p className="mt-3">
                <Link to={`${ROUTES.NEW_TRIP}?customer=${encodeURIComponent(created.family_code)}`} className="font-semibold underline underline-offset-4">
                  Plan their first trip
                </Link>
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
