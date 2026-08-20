export interface City {
  name: string;
  lat: number;
  lon: number;
  /** Relative population weight — determines what share of businesses land near this city. */
  weight: number;
  /** How far (in degrees) businesses jitter from the city center. Roughly 0.05 ≈ 5km, 0.3 ≈ 30km. */
  jitterDeg: number;
}

// ~30 real cities with rough population-based weights, so synthetic businesses
// cluster the way real listings do instead of scattering uniformly over the globe.
// Both seed.ts (where data is written) and the k6 scripts (where bboxes are built)
// import this same list, so load-test queries land on real clusters.
export const CITIES: City[] = [
  { name: "Beijing", lat: 39.9042, lon: 116.4074, weight: 21, jitterDeg: 0.25 },
  { name: "Shanghai", lat: 31.2304, lon: 121.4737, weight: 24, jitterDeg: 0.25 },
  { name: "Guangzhou", lat: 23.1291, lon: 113.2644, weight: 15, jitterDeg: 0.2 },
  { name: "Shenzhen", lat: 22.5431, lon: 114.0579, weight: 17, jitterDeg: 0.2 },
  { name: "Chengdu", lat: 30.5728, lon: 104.0668, weight: 16, jitterDeg: 0.2 },
  { name: "Hangzhou", lat: 30.2741, lon: 120.1551, weight: 10, jitterDeg: 0.18 },
  { name: "Wuhan", lat: 30.5928, lon: 114.3055, weight: 11, jitterDeg: 0.18 },
  { name: "Xian", lat: 34.3416, lon: 108.9398, weight: 9, jitterDeg: 0.18 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, weight: 14, jitterDeg: 0.2 },
  { name: "Osaka", lat: 34.6937, lon: 135.5023, weight: 8, jitterDeg: 0.15 },
  { name: "Seoul", lat: 37.5665, lon: 126.978, weight: 10, jitterDeg: 0.18 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198, weight: 6, jitterDeg: 0.12 },
  { name: "Bangkok", lat: 13.7563, lon: 100.5018, weight: 9, jitterDeg: 0.18 },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, weight: 11, jitterDeg: 0.2 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, weight: 13, jitterDeg: 0.2 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025, weight: 14, jitterDeg: 0.22 },
  { name: "New York", lat: 40.7128, lon: -74.006, weight: 13, jitterDeg: 0.2 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, weight: 9, jitterDeg: 0.2 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298, weight: 6, jitterDeg: 0.16 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194, weight: 5, jitterDeg: 0.12 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832, weight: 5, jitterDeg: 0.15 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, weight: 9, jitterDeg: 0.2 },
  { name: "Sao Paulo", lat: -23.5505, lon: -46.6333, weight: 11, jitterDeg: 0.2 },
  { name: "London", lat: 51.5074, lon: -0.1278, weight: 10, jitterDeg: 0.18 },
  { name: "Paris", lat: 48.8566, lon: 2.3522, weight: 8, jitterDeg: 0.15 },
  { name: "Berlin", lat: 52.52, lon: 13.405, weight: 5, jitterDeg: 0.15 },
  { name: "Istanbul", lat: 41.0082, lon: 28.9784, weight: 9, jitterDeg: 0.18 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, weight: 8, jitterDeg: 0.18 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792, weight: 9, jitterDeg: 0.18 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, weight: 5, jitterDeg: 0.15 },
];
