import { SharedArray } from "k6/data";

// SharedArray loads each JSON file once and shares it read-only across all VUs,
// regardless of how many virtual users k6 spins up — this is what keeps memory
// bounded even at thousands of VUs reusing the same token/city/business pools.
export const tokens = new SharedArray("tokens", function () {
  return JSON.parse(open("../data/tokens.json"));
});

export const cities = new SharedArray("cities", function () {
  return JSON.parse(open("../data/cities.json"));
});

export const businesses = new SharedArray("businesses", function () {
  return JSON.parse(open("../data/businesses-sample.json"));
});

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
];

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
];

let totalCityWeight = 0;
for (let i = 0; i < cities.length; i++) totalCityWeight += cities[i].weight;

/** Pick a city weighted by population, matching the distribution seed.ts placed businesses in. */
export function weightedCity() {
  let r = Math.random() * totalCityWeight;
  for (let i = 0; i < cities.length; i++) {
    r -= cities[i].weight;
    if (r <= 0) return cities[i];
  }
  return cities[cities.length - 1];
}

/** A random bbox centered near the city, sized off the same jitter radius seed.ts used. */
export function bboxAround(city) {
  const half = city.jitterDeg;
  const centerLat = city.lat + (Math.random() * 2 - 1) * half;
  const centerLon = city.lon + (Math.random() * 2 - 1) * half;
  const span = half * (0.3 + Math.random() * 0.7);
  return {
    minLat: centerLat - span,
    maxLat: centerLat + span,
    minLon: centerLon - span,
    maxLon: centerLon + span,
  };
}

export function randomToken() {
  return tokens[Math.floor(Math.random() * tokens.length)];
}

export function randomBusiness() {
  return businesses[Math.floor(Math.random() * businesses.length)];
}

export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Reads the `Server-Timing: app;dur=<ms>` header the backend stamps on every
 * response (see backend/src/index.ts) — a duration measured entirely inside
 * the Node process, with no network transit time baked in. Recording this
 * alongside k6's own http_req_duration (which *does* include the network
 * hop) lets a run from a remote machine (e.g. the laptop over LAN) show both
 * numbers side by side: the gap between them is network + OS-level overhead,
 * not app work. No clock sync between machines needed, since only a
 * duration crosses the wire, never a timestamp to compare against.
 */
export function parseServerTiming(res) {
  const headers = res.headers || {};
  let raw = null;
  for (const key in headers) {
    if (key.toLowerCase() === "server-timing") {
      raw = headers[key];
      break;
    }
  }
  if (!raw) return null;
  const match = raw.match(/dur=([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}
