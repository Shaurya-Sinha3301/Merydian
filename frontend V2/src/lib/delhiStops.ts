// Real stop coordinates from ml_or/data/locations.json, used to draw the route plate.
export interface MapStop { id: string; name: string; lat: number; lng: number }

export const DELHI_STOPS: MapStop[] = [
  { id: 'LOC_001', name: "Red Fort", lat: 28.65145, lng: 77.19408 },
  { id: 'LOC_002', name: "Qutub Minar", lat: 28.6658, lng: 77.18006 },
  { id: 'LOC_003', name: "India Gate", lat: 28.66004, lng: 77.21638 },
  { id: 'LOC_004', name: "Lotus Temple", lat: 28.53902, lng: 77.26365 },
  { id: 'LOC_005', name: "Humayun Tomb", lat: 28.67372, lng: 77.16785 },
  { id: 'LOC_006', name: "Akshardham", lat: 28.59988, lng: 77.15063 },
  { id: 'LOC_007', name: "Jama Masjid", lat: 28.63969, lng: 77.171 },
  { id: 'LOC_008', name: "Raj Ghat", lat: 28.58334, lng: 77.19665 },
  { id: 'LOC_009', name: "Purana Qila", lat: 28.6074, lng: 77.15621 },
  { id: 'LOC_010', name: "Safdarjung Tomb", lat: 28.64301, lng: 77.20892 },
  { id: 'LOC_011', name: "Hauz Khas Village", lat: 28.5534, lng: 77.1944 },
  { id: 'LOC_012', name: "Dilli Haat INA", lat: 28.5727, lng: 77.209 },
  { id: 'LOC_013', name: "Lodhi Gardens", lat: 28.5933, lng: 77.2197 },
  { id: 'LOC_014', name: "National Museum", lat: 28.6118, lng: 77.2193 },
  { id: 'LOC_015', name: "Chandni Chowk", lat: 28.6506, lng: 77.2303 },
  { id: 'LOC_016', name: "Sarojini Nagar Market", lat: 28.5758, lng: 77.1984 },
  { id: 'LOC_017', name: "Khan Market", lat: 28.6, lng: 77.227 },
  { id: 'LOC_018', name: "Agrasen ki Baoli", lat: 28.6261, lng: 77.225 },
  { id: 'LOC_019', name: "Garden of Five Senses", lat: 28.5135, lng: 77.1983 },
  { id: 'LOC_020', name: "National Gallery of Modern Art", lat: 28.6105, lng: 77.2345 },
];
