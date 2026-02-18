'use client';

import {
    Map,
    MapMarker,
    MapTileLayer,
    MapLayers,
    MapPopup
} from '@/components/ui/map';
import { LatLngExpression } from 'leaflet';

export default function BigMap() {
    // Delhi Coordinates
    const center: LatLngExpression = [28.6139, 77.2090];

    // Demo locations matching the itinerary
    const locations = [
        { name: "Raj Ghat", coords: [28.6406, 77.2495], day: "Day 1" },
        { name: "Red Fort", coords: [28.6562, 77.2410], day: "Day 1" },
        { name: "Safdarjung Tomb", coords: [28.5893, 77.2106], day: "Day 1" },
        { name: "Humayun's Tomb", coords: [28.5933, 77.2507], day: "Day 2" },
        { name: "Akshardham Temple", coords: [28.6127, 77.2773], day: "Day 2" },
        { name: "Purana Qila", coords: [28.6096, 77.2437], day: "Day 2" },
        { name: "India Gate", coords: [28.6129, 77.2295], day: "Day 3" },
    ];

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 h-96 relative overflow-hidden group">
            <Map center={center} zoom={11} className="h-full w-full rounded-2xl z-0">
                <MapLayers>
                    <MapTileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                </MapLayers>

                {locations.map((loc, idx) => (
                    <MapMarker key={idx} position={loc.coords as LatLngExpression}>
                        <MapPopup>
                            <div className="text-sm font-semibold">{loc.name}</div>
                            <div className="text-xs text-gray-500">{loc.day}</div>
                        </MapPopup>
                    </MapMarker>
                ))}
            </Map>

            {/* Overlay for "View Full Map" (Optional, maybe keep it small or remove if interactive) */}
            <div className="absolute bottom-4 right-4 z-[400]">
                <button className="bg-white px-4 py-2 rounded-full shadow-lg font-bold text-xs hover:scale-105 transition-transform">
                    Expand
                </button>
            </div>
        </div>
    );
}
