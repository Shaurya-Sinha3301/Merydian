import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useNoteActions, useTripNotes } from '../../hooks/usePhase3';
import { Button } from '../../ui/Button';
import { Empty, ErrorNote, Loading } from '../../ui/Surface';
import { Tag } from '../../ui/Tag';
import { timeAgo } from '../../lib/format';

function dueLabel(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** The agent's private notes and tasks for one trip. Travellers never see this tab. */
export function NotesPage() {
  const { tripId = '' } = useParams();
  const { data, isLoading, error } = useTripNotes(tripId);
  const { add, toggle, remove } = useNoteActions(tripId);
  const [kind, setKind] = useState<'note' | 'task'>('task');
  const [text, setText] = useState('');
  const [due, setDue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    add.mutate({ kind, text: text.trim(), due_on: kind === 'task' && due ? new Date(due).toISOString() : null }, { onSuccess: () => { setText(''); setDue(''); } });
  };

  if (isLoading) return <Loading label="Loading notes" />;
  if (error) return <ErrorNote>Notes could not be loaded.</ErrorNote>;
  const rows = data?.notes ?? [];
  const open = rows.filter((n) => n.kind === 'task' && !n.done);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="min-w-0 self-start border border-rule bg-paper" aria-label="Notes and tasks">
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-2.5">
          <h2 className="title text-lg">Notes and tasks</h2>
          <p className="text-sm text-ink-3">{open.length} open · private to agents</p>
        </div>
        {rows.length === 0 ? (
          <div className="p-3">
            <Empty title="Nothing yet">Keep what you promised the family, supplier details and follow-ups here.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {rows.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                {n.kind === 'task' ? (
                  <input type="checkbox" checked={n.done} onChange={(e) => toggle.mutate({ id: n.id, done: e.target.checked })} aria-label={`Mark done: ${n.text}`} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                ) : (
                  <span aria-hidden className="mt-2 h-2 w-2 shrink-0 bg-ink-3" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={n.done ? 'text-ink-3 line-through' : ''}>{n.text}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <span>{n.author || 'Agent'}</span>
                    <span>{timeAgo(n.created_at)}</span>
                    {n.kind === 'task' && n.due_on && <Tag tone={!n.done && new Date(n.due_on) < new Date() ? 'removed' : 'pending'}>Due {dueLabel(n.due_on)}</Tag>}
                  </p>
                </div>
                <button type="button" onClick={() => remove.mutate(n.id)} className="text-xs font-semibold text-ink-3 underline underline-offset-4 hover:text-ink">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submit} className="flex flex-col gap-3 self-start border border-ink bg-paper p-4">
        <h3 className="title text-lg">Add</h3>
        <div className="flex divide-x divide-rule border border-ink" role="group" aria-label="Kind">
          {(['task', 'note'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`h-10 flex-1 text-sm font-semibold capitalize ${kind === k ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}>
              {k}
            </button>
          ))}
        </div>
        <textarea aria-label="Text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder={kind === 'task' ? 'Call Taj to confirm the extra bed' : 'Prefers a ground-floor room'} className="w-full rounded-sm border border-ink bg-paper px-3 py-2" />
        {kind === 'task' && (
          <label className="text-sm font-bold">
            Due
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1.5 h-11 w-full rounded-sm border border-ink bg-paper px-3 text-base font-normal" />
          </label>
        )}
        <Button type="submit" loading={add.isPending} disabled={!text.trim()}>
          Add {kind}
        </Button>
        {add.isError && <ErrorNote>That could not be saved.</ErrorNote>}
      </form>
    </div>
  );
}
