/** Loose marks that lock to the module. Front door only: a working screen never wears them. */
const MARKS = [
  { x: '3%', y: '6%', s: 22, c: '#e4007c', r: 12, shape: 'sq' },
  { x: '93%', y: '9%', s: 28, c: '#ffd200', r: -8, shape: 'sq' },
  { x: '90%', y: '80%', s: 20, c: '#3cb043', r: 20, shape: 'tri' },
  { x: '6%', y: '90%', s: 26, c: '#00a3e0', r: -14, shape: 'sq' },
  { x: '52%', y: '2%', s: 14, c: '#101418', r: 30, shape: 'sq' },
] as const;

export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {MARKS.map((m, i) => (
        <span
          key={i}
          className="drift absolute block"
          style={{
            left: m.x,
            top: m.y,
            width: m.s,
            height: m.s,
            background: m.c,
            clipPath: m.shape === 'tri' ? 'polygon(0 100%, 50% 0, 100% 100%)' : undefined,
            ['--r' as string]: `${m.r}deg`,
            ['--i' as string]: i,
            transform: `rotate(${m.r}deg)`,
          }}
        />
      ))}
    </div>
  );
}
