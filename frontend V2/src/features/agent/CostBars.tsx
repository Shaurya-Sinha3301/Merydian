interface Item {
  label: string;
  value: number;
}

/** Horizontal bars on a ruled scale: one row per item, the figure printed at the bar's end. */
export function CostBars({ items, className = '', format }: { items: Item[]; className?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const fmt = format ?? ((n: number) => `₹${n.toLocaleString('en-IN')}`);
  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[10rem_1fr_4.5rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-2">{i.label}</span>
          <span className="relative h-4 border-l border-ink bg-[linear-gradient(to_right,var(--color-rule)_1px,transparent_1px)] bg-[length:25%_100%]">
            <span className="block h-full bg-cyan" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{fmt(i.value)}</span>
        </li>
      ))}
    </ul>
  );
}
