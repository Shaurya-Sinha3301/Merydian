import { type ReactNode } from 'react';

/** A panel: flat panel ground with a ruled edge. Never nested. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-paper shadow-[var(--shadow-card)] ${className}`}>{children}</section>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="title text-4xl sm:text-5xl">{title}</h1>
        {sub && <p className="mt-2 max-w-[62ch] text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink-3 p-8 sm:p-10">
      <h2 className="title text-2xl">{title}</h2>
      {children && <p className="mt-2 max-w-[56ch] text-ink-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-ink-2">
      <span aria-hidden className="block h-2 w-16 bg-cyan fill-x" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-l-0 bg-magenta px-3 py-2 text-sm font-bold text-paper">
      {children}
    </p>
  );
}
