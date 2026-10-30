import { PHOTO_CREDITS, type PhotoCredit } from '../data/photoCredits';

/** Stop name (as the plan shows it) to the location id whose photo represents it. */
const BY_NAME: Record<string, string> = {
  'red fort': 'LOC_001',
  'qutub minar': 'LOC_002',
  'india gate': 'LOC_003',
  'lotus temple': 'LOC_004',
  'humayun tomb': 'LOC_005',
  "humayun's tomb": 'LOC_005',
  akshardham: 'LOC_006',
  'jama masjid': 'LOC_007',
  'raj ghat': 'LOC_008',
  'purana qila': 'LOC_009',
  'safdarjung tomb': 'LOC_010',
  "safdarjung's tomb": 'LOC_010',
  'hauz khas village': 'LOC_011',
  'hauz khas': 'LOC_011',
  'lodhi gardens': 'LOC_013',
  'national museum': 'LOC_014',
  'agrasen ki baoli': 'LOC_018',
};

const FILES = new Map(PHOTO_CREDITS.map((c) => [c.id, c]));

export function photoById(id?: string | null): PhotoCredit | undefined {
  return id ? FILES.get(id) : undefined;
}

export function photoForStop(nameOrId?: string | null): PhotoCredit | undefined {
  if (!nameOrId) return undefined;
  const direct = FILES.get(nameOrId);
  if (direct) return direct;
  const key = nameOrId.trim().toLowerCase();
  const id = BY_NAME[key];
  return id ? FILES.get(id) : undefined;
}

/** A photo to lead a trip or a day: the first of its stops that has one. */
export function leadPhoto(names: Array<string | undefined | null>): PhotoCredit | undefined {
  for (const n of names) {
    const p = photoForStop(n);
    if (p) return p;
  }
  return undefined;
}

/** Fallback photo for pages with no stop context. */
export const HERO_PHOTOS = {
  fort: photoById('LOC_001')!,
  tomb: photoById('LOC_005')!,
  gate: photoById('LOC_003')!,
  temple: photoById('LOC_004')!,
  gardens: photoById('LOC_013')!,
  stepwell: photoById('LOC_018')!,
  hauzKhas: photoById('LOC_011')!,
  qutub: photoById('LOC_002')!,
};

const TRIP_KEYWORDS: Array<[RegExp, string]> = [
  [/family/i, 'LOC_003'],
  [/luxury|retreat/i, 'LOC_005'],
  [/budget|backpack/i, 'LOC_011'],
  [/golden|elder|relax/i, 'LOC_013'],
  [/access/i, 'LOC_004'],
];
const TRIP_FALLBACK = ['LOC_001', 'LOC_005', 'LOC_007', 'LOC_018', 'LOC_002'];

/** A photo for a trip card, chosen from its name so the same trip always gets the same picture. */
export function photoForTrip(name?: string | null): PhotoCredit | undefined {
  const n = name ?? '';
  const hit = TRIP_KEYWORDS.find(([re]) => re.test(n));
  if (hit) return FILES.get(hit[1]);
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FILES.get(TRIP_FALLBACK[h % TRIP_FALLBACK.length]);
}
