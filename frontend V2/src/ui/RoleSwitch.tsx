export type AccountRole = 'traveller' | 'agent';

const OPTIONS: Array<{ id: AccountRole; label: string; note: string }> = [
  { id: 'traveller', label: 'Traveller', note: 'Plan a trip and follow every change' },
  { id: 'agent', label: 'Travel agent', note: 'Run customers, trips and approvals' },
];

/** Which kind of account the form is for. Used on sign in and sign up. */
export function RoleSwitch({ value, onChange }: { value: AccountRole; onChange: (role: AccountRole) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-bold">I am a</legend>
      <div className="grid grid-cols-2 divide-x divide-rule border border-ink">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`px-3 py-2 text-left ${value === o.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-panel'}`}
          >
            <span className="block text-sm font-semibold">{o.label}</span>
            <span className={`block text-xs ${value === o.id ? 'text-paper/80' : 'text-ink-3'}`}>{o.note}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
