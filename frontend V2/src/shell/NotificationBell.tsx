import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useLiveNotifications, useMarkRead, useNotifications } from '../hooks/usePhase3';
import { timeAgo } from '../lib/format';
import type { NotificationItem } from '../services/phase3';

const TONE: Record<string, string> = {
  'decision.created': 'bg-yellow',
  'decision.accepted': 'bg-green',
  'decision.declined': 'bg-magenta',
  'plan.published': 'bg-green',
  'feedback.processed': 'bg-cyan',
  'feedback.received': 'bg-cyan',
  'job.failed': 'bg-magenta',
  'booking.created': 'bg-cyan',
  'booking.updated': 'bg-cyan',
};

function Dot({ type }: { type: string }) {
  return <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 ${TONE[type] ?? 'bg-ink-3'}`} />;
}

/** The bell, its list and the live toasts. Opens the stream while the shell is mounted. */
export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const { toasts, dismiss, live } = useLiveNotifications();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const go = (n: NotificationItem) => {
    if (!n.read) markRead.mutate([n.id]);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center border border-rule bg-paper hover:border-ink"
      >
        <Bell size={17} aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center bg-magenta px-1 text-[11px] font-bold text-paper">{unread > 99 ? '99+' : unread}</span>
        )}
        <span aria-hidden className={`absolute bottom-0.5 right-0.5 h-1.5 w-1.5 ${live ? 'bg-green' : 'bg-rule'}`} title={live ? 'Live' : 'Reconnecting'} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[92vw] border border-ink bg-paper" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
            <p className="title text-base">Notifications</p>
            <button type="button" onClick={() => markRead.mutate(undefined)} disabled={unread === 0} className="text-xs font-semibold underline underline-offset-4 disabled:text-ink-3 disabled:no-underline">
              Mark all read
            </button>
          </div>
          <ul className="max-h-[26rem] divide-y divide-rule overflow-y-auto">
            {(data?.notifications ?? []).map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => go(n)} className={`flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-panel ${n.read ? '' : 'bg-navy-tint'}`}>
                  <Dot type={n.type} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    {n.body && <span className="line-clamp-2 block text-xs text-ink-2">{n.body}</span>}
                    <span className="block text-[11px] text-ink-3">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
            {(data?.notifications ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">Nothing yet. Updates appear here as they happen.</li>}
          </ul>
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-[22rem] max-w-[92vw] flex-col gap-2" aria-live="polite">
        {toasts.map((n) => (
          <div key={n.id} className="pointer-events-auto flex gap-2.5 border border-ink bg-paper p-3">
            <Dot type={n.type} />
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { dismiss(n.id); go(n); }}>
              <span className="block text-sm font-semibold">{n.title}</span>
              {n.body && <span className="line-clamp-2 block text-xs text-ink-2">{n.body}</span>}
            </button>
            <button type="button" onClick={() => dismiss(n.id)} aria-label="Dismiss" className="self-start text-ink-3 hover:text-ink">
              <X size={15} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
