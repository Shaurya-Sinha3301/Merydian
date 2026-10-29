import { ChevronLeft, ChevronRight } from 'lucide-react';

export function MonthNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const btn = 'flex h-8 w-8 items-center justify-center border border-rule bg-paper hover:bg-panel';
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrev} className={btn} aria-label="Previous month">
        <ChevronLeft size={16} aria-hidden />
      </button>
      <p className="min-w-32 text-center text-sm font-semibold">{label}</p>
      <button type="button" onClick={onNext} className={btn} aria-label="Next month">
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}
