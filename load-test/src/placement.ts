import { CITIES, City } from "./cities";

export const CATEGORIES = [
  "RESTAURANT",
  "CAFE",
  "GROCERY",
  "GAS_STATION",
  "RETAIL",
  "HEALTHCARE",
  "ENTERTAINMENT",
  "LODGING",
  "OTHER",
] as const;

export const KEYWORDS = [
  "coffee",
  "fast",
  "friendly",
  "cozy",
  "affordable",
  "popular",
  "family",
  "modern",
  "organic",
  "local",
  "authentic",
  "spacious",
];

const TOTAL_WEIGHT = CITIES.reduce((sum, c) => sum + c.weight, 0);

/** Deterministic pseudo-random float in [0, 1) derived from an integer seed (mulberry32-style mix). */
function hash01(seed: number): number {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = (x ^ (x >>> 15)) >>> 0;
  return x / 4294967296;
}

/** Weighted-deterministic city pick for a given global business index. */
export function pickCity(index: number, cities: City[] = CITIES): City {
  const r = hash01(index * 2 + 1) * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const city of cities) {
    cumulative += city.weight;
    if (r < cumulative) return city;
  }
  return cities[cities.length - 1];
}

export function pickCategory(index: number): (typeof CATEGORIES)[number] {
  const i = Math.floor(hash01(index * 2 + 2) * CATEGORIES.length);
  return CATEGORIES[Math.min(i, CATEGORIES.length - 1)];
}

export function pickKeywords(index: number, count = 3): string[] {
  const words: string[] = [];
  for (let k = 0; k < count; k++) {
    const i = Math.floor(hash01(index * 7 + k * 13 + 3) * KEYWORDS.length);
    words.push(KEYWORDS[Math.min(i, KEYWORDS.length - 1)]);
  }
  return words;
}

export interface PlacedBusiness {
  lat: number;
  lon: number;
  city: City;
  category: (typeof CATEGORIES)[number];
}

/** Fully deterministic placement — same index always yields the same lat/lon/category, with no DB lookup. */
export function placeBusiness(index: number): PlacedBusiness {
  const city = pickCity(index);
  const dLat = (hash01(index * 3 + 5) * 2 - 1) * city.jitterDeg;
  const dLon = (hash01(index * 3 + 6) * 2 - 1) * city.jitterDeg;
  return {
    lat: city.lat + dLat,
    lon: city.lon + dLon,
    city,
    category: pickCategory(index),
  };
}
