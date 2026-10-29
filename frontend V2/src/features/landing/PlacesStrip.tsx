import { Plate } from '../../ui/Photo';
import { photoById } from '../../lib/photos';

const PLACES = ['LOC_001', 'LOC_005', 'LOC_004', 'LOC_018', 'LOC_013', 'LOC_007'];

/** Six places from the demo trips as printed plates. */
export function PlacesStrip() {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {PLACES.map((id) => (
        <li key={id} data-rise>
          <Plate photo={photoById(id)} imgClassName="aspect-[3/4]" />
        </li>
      ))}
    </ul>
  );
}
