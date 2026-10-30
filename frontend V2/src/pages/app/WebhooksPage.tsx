import { useState, type FormEvent } from 'react';
import { useWebhookActions, useWebhookDeliveries, useWebhooks } from '../../hooks/usePhase3';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { timeAgo } from '../../lib/format';
import { useTitle } from '../../lib/useTitle';
import type { WebhookEndpoint } from '../../services/phase3';

const FORMATS = [
  { id: 'json', label: 'JSON', note: 'Signed POST for your own server' },
  { id: 'slack', label: 'Slack', note: 'Incoming webhook text' },
  { id: 'discord', label: 'Discord', note: 'Channel webhook text' },
] as const;

function messageOf(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; detail?: string } }; message?: string };
  return e.response?.data?.message || e.response?.data?.detail || e.message || 'Something went wrong.';
}

function Deliveries({ id }: { id: string }) {
  const { data, isLoading } = useWebhookDeliveries(id);
  if (isLoading) return <Loading label="Loading deliveries" />;
  const rows = data?.deliveries ?? [];
  if (rows.length === 0) return <p className="px-4 py-4 text-sm text-ink-3">Nothing sent yet. Use Send a test event.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="ruled min-w-[34rem]">
        <thead>
          <tr>
            <th>Event</th>
            <th>Result</th>
            <th className="num">Tries</th>
            <th className="num">Took</th>
            <th className="num">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td className="font-semibold">{d.event}</td>
              <td>
                <Tag tone={d.ok ? 'added' : 'removed'}>{d.ok ? `Delivered ${d.status_code ?? ''}` : 'Failed'}</Tag>
                {d.error && <span className="ml-2 text-xs text-magenta">{d.error}</span>}
              </td>
              <td className="num">{d.attempts}</td>
              <td className="num">{d.duration_ms != null ? `${d.duration_ms} ms` : '—'}</td>
              <td className="num whitespace-nowrap text-ink-3">{timeAgo(d.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointRow({ ep }: { ep: WebhookEndpoint }) {
  const { update, remove, test } = useWebhookActions();
  const [open, setOpen] = useState(false);
  const result = test.data;

  return (
    <li className="border-b border-rule last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {ep.name} <span className="ml-1 text-xs font-normal text-ink-3">{ep.format}</span>
          </p>
          <p className="truncate text-sm text-ink-2">{ep.url}</p>
          <p className="text-xs text-ink-3">
            {ep.events.length ? ep.events.join(', ') : 'Every event'} · secret ending {ep.secret_hint}
            {ep.last_delivery_at ? ` · last sent ${timeAgo(ep.last_delivery_at)} (${ep.last_status})` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={ep.active ? 'added' : 'neutral'}>{ep.active ? 'On' : 'Off'}</Tag>
          <Button variant="outline" loading={test.isPending} onClick={() => test.mutate(ep.id)}>
            Send a test event
          </Button>
          <Button variant="quiet" onClick={() => update.mutate({ id: ep.id, body: { active: !ep.active } })}>
            {ep.active ? 'Turn off' : 'Turn on'}
          </Button>
          <Button variant="quiet" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide log' : 'Delivery log'}
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              if (window.confirm(`Delete ${ep.name}? Its delivery log goes with it.`)) remove.mutate(ep.id);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      {result && (
        <p className={`px-4 pb-3 text-sm font-semibold ${result.ok ? 'text-green' : 'text-magenta'}`}>
          {result.ok ? `Delivered (${result.status_code}) in ${result.duration_ms} ms.` : `Not delivered after ${result.attempts} tries: ${result.error ?? 'no answer'}.`}
        </p>
      )}
      {open && (
        <div className="border-t border-rule bg-panel">
          <Deliveries id={ep.id} />
        </div>
      )}
    </li>
  );
}

export function WebhooksPage() {
  useTitle('Webhooks');
  const { data, isLoading, error } = useWebhooks();
  const { create } = useWebhookActions();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<(typeof FORMATS)[number]['id']>('json');
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  const errors = {
    name: name.trim().length < 2 ? 'Give it a name.' : '',
    url: /^https?:\/\/.+\..+|^http:\/\/localhost/.test(url.trim()) ? '' : 'Enter a full URL, starting with https://.',
  };

  const toggle = (e: string) =>
    setEvents((s) => {
      const n = new Set(s);
      if (n.has(e)) n.delete(e);
      else n.add(e);
      return n;
    });

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    if (errors.name || errors.url) return;
    create.mutate(
      { name: name.trim(), url: url.trim(), format, events: [...events] },
      {
        onSuccess: () => {
          setName('');
          setUrl('');
          setEvents(new Set());
          setTouched(false);
        },
      },
    );
  };

  const created = create.data;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl sm:text-4xl">Webhooks</h1>
        <p className="text-sm text-ink-3">{data?.endpoints.length ?? 0} {data?.endpoints.length === 1 ? 'endpoint' : 'endpoints'}</p>
      </div>
      <p className="mt-1 max-w-[72ch] text-ink-2">
        Send the events you choose to your own systems as they happen: a Slack or Discord channel, or any server. JSON calls are signed so you can check they came from here.
      </p>

      {created?.secret && (
        <div className="mt-4 border border-green bg-green-tint p-4 text-sm" role="status">
          <p className="font-bold">{created.name} is ready. Copy its signing secret now, it is shown once.</p>
          <p className="mt-2 select-all break-all border border-rule bg-paper px-2 py-1.5 font-mono text-base">{created.secret}</p>
          <p className="mt-2 text-ink-2">
            Each JSON call carries <span className="font-mono">X-Merydian-Signature: sha256=…</span>, the HMAC-SHA256 of <span className="font-mono">timestamp + &quot;.&quot; + body</span> using this secret, with the timestamp in{' '}
            <span className="font-mono">X-Merydian-Timestamp</span>.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 self-start border border-rule bg-paper" aria-label="Endpoints">
          <h2 className="title border-b-2 border-ink px-4 py-2.5 text-lg">Endpoints</h2>
          {isLoading && <Loading label="Loading webhooks" />}
          {error && (
            <div className="p-3">
              <ErrorNote>Webhooks could not be loaded.</ErrorNote>
            </div>
          )}
          {data && data.endpoints.length === 0 && <p className="px-4 py-6 text-sm text-ink-2">No endpoints yet. Add one with the form.</p>}
          <ul>{data?.endpoints.map((ep) => <EndpointRow key={ep.id} ep={ep} />)}</ul>
        </section>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4 self-start border border-ink bg-paper p-4">
          <h2 className="title text-lg">Add an endpoint</h2>
          <Input id="wh-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} error={touched ? errors.name : ''} placeholder="Ops channel" />
          <Input id="wh-url" label="URL" value={url} onChange={(e) => setUrl(e.target.value)} error={touched ? errors.url : ''} placeholder="https://hooks.slack.com/services/…" />
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">Format</legend>
            <div className="grid grid-cols-3 divide-x divide-rule border border-ink">
              {FORMATS.map((f) => (
                <button key={f.id} type="button" aria-pressed={format === f.id} onClick={() => setFormat(f.id)} className={`px-2 py-2 text-left ${format === f.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}>
                  <span className="block text-sm font-semibold">{f.label}</span>
                  <span className={`block text-[11px] leading-tight ${format === f.id ? 'text-paper/80' : 'text-ink-3'}`}>{f.note}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">Events</legend>
            <p className="mb-2 text-xs text-ink-3">Leave all unticked to receive everything.</p>
            <ul className="flex flex-col gap-1.5">
              {data?.events
                .filter((e) => e.name !== 'webhook.test')
                .map((e) => (
                  <li key={e.name}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input type="checkbox" checked={events.has(e.name)} onChange={() => toggle(e.name)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                      <span>
                        <span className="font-semibold">{e.name}</span>
                        <span className="block text-xs text-ink-3">{e.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
            </ul>
          </fieldset>
          {create.isError && <ErrorNote>{messageOf(create.error)}</ErrorNote>}
          <Button type="submit" loading={create.isPending}>
            Add endpoint
          </Button>
        </form>
      </div>
    </div>
  );
}
