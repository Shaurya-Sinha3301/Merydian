import { useState } from 'react';
import { useApiKeyActions, useApiKeys, useMessages, useSettings, useSettingsActions } from '../../hooks/usePhase4';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { ErrorNote, Loading } from '../../ui/Surface';
import { Tag, type Tone } from '../../ui/Tag';
import { timeAgo } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';
import type { SettingsView } from '../../services/phase4';

const STATUS: Record<string, { tone: Tone; label: string }> = {
  sent: { tone: 'added', label: 'Sent' },
  logged: { tone: 'pending', label: 'Recorded, not sent' },
  queued: { tone: 'ai', label: 'Sending' },
  failed: { tone: 'removed', label: 'Failed' },
};

function messageOf(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.detail || e.message || 'Something went wrong.';
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
    </label>
  );
}

function Channel({ title, address, configured, on, types, all, onToggle, onTypes, onTest, testing }: {
  title: string;
  address: string;
  configured: boolean;
  on: boolean;
  types: string[];
  all: SettingsView['event_types'];
  onToggle: (v: boolean) => void;
  onTypes: (t: string[]) => void;
  onTest: () => void;
  testing: boolean;
}) {
  return (
    <section className="border border-rule bg-paper" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-2.5">
        <h2 className="title text-lg">{title}</h2>
        <Tag tone={configured ? 'added' : 'pending'}>{configured ? 'Delivery on' : 'Not set up on this server'}</Tag>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <Toggle on={on} onChange={onToggle} label={`Send me ${title.toLowerCase()} notifications`} hint={address || 'Add a phone number below first'} />
        {on && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Send these</legend>
            <ul className="grid gap-2 sm:grid-cols-2">
              {all.map((e) => (
                <li key={e.name}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" checked={types.includes(e.name)} onChange={(ev) => onTypes(ev.target.checked ? [...types, e.name] : types.filter((t) => t !== e.name))} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                    <span>
                      <span className="font-semibold">{e.name}</span>
                      <span className="block text-xs text-ink-3">{e.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <div>
          <Button variant="outline" onClick={onTest} loading={testing}>
            Send a test {title.toLowerCase() === 'sms' ? 'text' : 'email'}
          </Button>
        </div>
        {!configured && <p className="text-xs text-ink-3">Nothing leaves this server yet, so messages are recorded below instead. Add the provider details in the server settings to send them.</p>}
      </div>
    </section>
  );
}

export function SettingsPage() {
  useTitle('Settings');
  const { data, isLoading, error } = useSettings();
  const { save, test } = useSettingsActions();
  const messages = useMessages();
  const keys = useApiKeys();
  const keyActions = useApiKeyActions();
  const [phone, setPhone] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');

  if (isLoading) return <Loading label="Loading settings" />;
  if (error || !data) return <ErrorNote>Settings could not be loaded.</ErrorNote>;
  const agent = data.role === 'agent';
  const created = keyActions.create.data;

  return (
    <div>
      <h1 className="display text-3xl sm:text-4xl">Settings</h1>
      <p className="mt-1 max-w-[70ch] text-ink-2">How we reach you, and what we send.</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
          <section className="border border-rule bg-paper" aria-label="Profile">
            <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">You</h2>
            <form
              className="grid gap-4 p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ full_name: name ?? data.full_name ?? undefined, phone: phone ?? data.phone ?? '' });
              }}
            >
              <Input id="s-name" label="Name" value={name ?? data.full_name ?? ''} onChange={(e) => setName(e.target.value)} />
              <Input id="s-email" label="Email" value={data.email} readOnly disabled hint="Your sign-in address." />
              <Input id="s-phone" label="Mobile number" value={phone ?? data.phone ?? ''} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" hint="With the country code. Used only for texts you turn on." />
              <div className="flex items-end">
                <Button type="submit" loading={save.isPending}>
                  Save
                </Button>
              </div>
              {save.isError && <div className="sm:col-span-2"><ErrorNote>{messageOf(save.error)}</ErrorNote></div>}
              {save.isSuccess && <p className="text-sm font-semibold text-green sm:col-span-2">Saved.</p>}
            </form>
          </section>

          <Channel
            title="Email"
            address={data.email}
            configured={data.channels.email}
            on={data.email_enabled}
            types={data.email_types}
            all={data.event_types}
            onToggle={(v) => save.mutate({ email_enabled: v })}
            onTypes={(t) => save.mutate({ email_types: t })}
            onTest={() => test.mutate('email')}
            testing={test.isPending && test.variables === 'email'}
          />
          <Channel
            title="SMS"
            address={data.phone ?? ''}
            configured={data.channels.sms}
            on={data.sms_enabled}
            types={data.sms_types}
            all={data.event_types}
            onToggle={(v) => save.mutate({ sms_enabled: v })}
            onTypes={(t) => save.mutate({ sms_types: t })}
            onTest={() => test.mutate('sms')}
            testing={test.isPending && test.variables === 'sms'}
          />
          {test.isError && <ErrorNote>{messageOf(test.error)}</ErrorNote>}
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
          <section className="border border-rule bg-paper" aria-label="Recent messages">
            <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Messages sent to you</h2>
            <ul className="divide-y divide-rule">
              {(messages.data?.messages ?? []).slice(0, 8).map((m) => (
                <li key={m.id} className="px-4 py-2.5 text-sm">
                  <p className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">{m.subject || (m.channel === 'sms' ? 'Text message' : 'Email')}</span>
                    <Tag tone={STATUS[m.status]?.tone ?? 'neutral'}>{STATUS[m.status]?.label ?? m.status}</Tag>
                  </p>
                  <p className="text-xs text-ink-3">
                    {m.channel} to {m.to} · {timeAgo(m.created_at)}
                    {m.error ? ` · ${m.error}` : ''}
                  </p>
                </li>
              ))}
              {(messages.data?.messages ?? []).length === 0 && <li className="px-4 py-5 text-sm text-ink-3">Nothing yet.</li>}
            </ul>
          </section>

          {agent && data.agency && (
            <section className="border border-rule bg-paper" aria-label="Agency">
              <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Your agency</h2>
              <div className="p-4 text-sm">
                <p className="text-lg font-bold">{data.agency.name}</p>
                <p className="mt-1 text-ink-2">Share this code with colleagues and customers. They enter it when they sign up and join your agency.</p>
                <p className="mt-2 select-all border border-rule bg-panel px-2 py-1.5 font-mono text-base">{data.agency.join_code}</p>
              </div>
            </section>
          )}
          {agent && !data.agency && (
            <section className="border border-rule bg-paper p-4 text-sm text-ink-2" aria-label="Agency">
              You work on the shared open desk. Sign up with an agency name to keep your customers and trips to yourselves.
            </section>
          )}

          {agent && (
            <section className="border border-rule bg-paper" aria-label="API keys">
              <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">API keys</h2>
              <div className="flex flex-col gap-3 p-4 text-sm">
                <p className="text-ink-2">
                  A key lets a script or partner act as you. Send it as <span className="font-mono">Authorization: Bearer mk_…</span>. The interactive reference is at <span className="font-mono">/docs</span> on the API.
                </p>
                {created?.key && (
                  <div className="border border-green bg-green-tint p-3" role="status">
                    <p className="font-bold">Copy it now, it is shown once.</p>
                    <p className="mt-1 select-all break-all border border-rule bg-paper px-2 py-1.5 font-mono">{created.key}</p>
                  </div>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (keyName.trim().length >= 2) keyActions.create.mutate(keyName.trim(), { onSuccess: () => setKeyName('') });
                  }}
                >
                  <input aria-label="Key name" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Spreadsheet sync" className="h-10 min-w-0 flex-1 rounded-sm border border-ink bg-paper px-3" />
                  <Button type="submit" loading={keyActions.create.isPending} disabled={keyName.trim().length < 2}>
                    Create key
                  </Button>
                </form>
                {keyActions.create.isError && <ErrorNote>{messageOf(keyActions.create.error)}</ErrorNote>}
                <ul className="divide-y divide-rule border border-rule">
                  {(keys.data?.keys ?? []).map((k) => (
                    <li key={k.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className={`block font-semibold ${k.revoked ? 'text-ink-3 line-through' : ''}`}>{k.name}</span>
                        <span className="block text-xs text-ink-3">
                          {k.prefix}… · {k.last_used_at ? `used ${timeAgo(k.last_used_at)}` : 'never used'}
                        </span>
                      </span>
                      {!k.revoked && (
                        <button type="button" onClick={() => keyActions.revoke.mutate(k.id)} className="text-xs font-semibold underline underline-offset-4">
                          Revoke
                        </button>
                      )}
                    </li>
                  ))}
                  {(keys.data?.keys ?? []).length === 0 && <li className="px-3 py-3 text-ink-3">No keys yet.</li>}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
