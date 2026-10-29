import { Photo, Bands } from '../../ui/Photo';
import { photoById } from '../../lib/photos';

const PLACES = [
  { id: 'LOC_001', name: 'Red Fort', note: 'Old Delhi', band: 'bg-cyan' },
  { id: 'LOC_005', name: "Humayun's Tomb", note: 'Gardens and water', band: 'bg-magenta' },
  { id: 'LOC_004', name: 'Lotus Temple', note: 'Step-free paths', band: 'bg-yellow' },
  { id: 'LOC_018', name: 'Agrasen ki Baoli', note: 'Free to enter', band: 'bg-green' },
  { id: 'LOC_013', name: 'Lodhi Gardens', note: 'Calm and shaded', band: 'bg-cyan' },
  { id: 'LOC_007', name: 'Jama Masjid', note: 'Old Delhi', band: 'bg-magenta' },
];

export function PlacesStrip() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {PLACES.map((p) => (
        <li key={p.id}>
          <Photo photo={photoById(p.id)} alt={`${p.name}, Delhi`} scrim className="aspect-[3/4] rounded-2xl">
            <span aria-hidden className={`absolute inset-x-0 bottom-0 h-2 ${p.band}`} />
            <div className="absolute inset-x-0 bottom-2 p-3 text-paper">
              <p className="text-base font-extrabold leading-tight">{p.name}</p>
              <p className="text-xs opacity-90">{p.note}</p>
            </div>
          </Photo>
        </li>
      ))}
    </ul>
  );
}

export { Bands };
