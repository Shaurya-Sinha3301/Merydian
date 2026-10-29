import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DELHI_STOPS } from '../../lib/delhiStops';

export interface MapPoint {
  id: string;
  title: string;
}

interface TripMapProps {
  /** The day's stops, in order. */
  points: MapPoint[];
  /** Stops dropped from this day: shown as magenta crosses, not on the route. */
  ghosts?: MapPoint[];
  /** Marker fill per stop id for stops carrying a state (green new, magenta dropped). */
  colors?: Record<string, string>;
  className?: string;
  label: string;
}

const BY_ID = new Map(DELHI_STOPS.map((s) => [s.id, s]));
const CENTER: L.LatLngTuple = [28.6, 77.21];

function marker(n: number | string, fill: string, text: string, size = 30) {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:flex;width:${size}px;height:${size}px;align-items:center;justify-content:center;background:${fill};color:${text};font:700 ${size < 24 ? 11 : 14}px 'Archivo Variable',system-ui,sans-serif;border:${size < 24 ? 2 : 3}px solid #fff;box-shadow:0 2px 6px rgba(16,20,24,.35);border-radius:2px">${n}</span>`,
  });
}

/** A real map of one day: numbered stops joined by a route bar. Tiles are OpenStreetMap. */
export function TripMap({ points, ghosts = [], colors = {}, className = '', label }: TripMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(CENTER, 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    const coords: L.LatLngTuple[] = [];
    points.forEach((p, i) => {
      const s = BY_ID.get(p.id);
      if (!s) return;
      const ll: L.LatLngTuple = [s.lat, s.lng];
      coords.push(ll);
      const fill = colors[p.id] ?? '#14181d';
      const text = '#ffffff';
      L.marker(ll, { icon: marker(i + 1, fill, text, points.length > 6 ? 20 : 30), title: p.title, keyboard: false }).addTo(g);
    });
    if (coords.length > 1) {
      L.polyline(coords, { color: '#ffffff', weight: 10, opacity: 0.95, lineCap: 'butt' }).addTo(g);
      L.polyline(coords, { color: '#17407f', weight: 5, lineCap: 'butt' }).addTo(g);
    }
    ghosts.forEach((p) => {
      const s = BY_ID.get(p.id);
      if (!s) return;
      coords.push([s.lat, s.lng]);
      L.marker([s.lat, s.lng], { icon: marker('×', '#c4231a', '#ffffff'), title: `${p.title} (dropped)`, keyboard: false }).addTo(g);
    });
    if (coords.length > 0) m.fitBounds(L.latLngBounds(coords), { padding: [36, 36], maxZoom: 14 });
  }, [points, ghosts, colors]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <div ref={el} role="region" aria-label={label} className="absolute inset-0" />
    </div>
  );
}
