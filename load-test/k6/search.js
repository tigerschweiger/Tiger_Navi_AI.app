import http from "k6/http";
import { check } from "k6";
import { weightedCity, bboxAround, randomToken, CATEGORIES, KEYWORDS, randomFrom } from "./lib/data.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

// Default profile ramps through the concurrency tiers we actually care about —
// 100 -> 1000 -> 5000 VUs — so one run shows how p95/p99 degrade as load climbs.
const fullStages = [
  { duration: "30s", target: 100 },
  { duration: "1m", target: 100 },
  { duration: "30s", target: 1000 },
  { duration: "1m", target: 1000 },
  { duration: "30s", target: 5000 },
  { duration: "2m", target: 5000 },
  { duration: "30s", target: 0 },
];

// SMOKE=1 swaps in a tiny, fast profile for verifying the script/data itself
// end-to-end before committing to a multi-minute full run.
const smokeStages = [
  { duration: "10s", target: 10 },
  { duration: "20s", target: 50 },
  { duration: "10s", target: 0 },
];

export const options = {
  scenarios: {
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeStages : fullStages,
      exec: "search",
    },
  },
  thresholds: {
    // Encodes the <1s query-latency target directly as pass/fail.
    http_req_duration: ["p(50)<300", "p(95)<800", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

function buildQuery(paramsObj) {
  return Object.keys(paramsObj)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(paramsObj[k])}`)
    .join("&");
}

export function search() {
  const city = weightedCity();
  const bbox = bboxAround(city);

  const params = {
    minLat: bbox.minLat.toFixed(6),
    minLon: bbox.minLon.toFixed(6),
    maxLat: bbox.maxLat.toFixed(6),
    maxLon: bbox.maxLon.toFixed(6),
  };
  if (Math.random() < 0.3) params.category = randomFrom(CATEGORIES);
  if (Math.random() < 0.2) params.q = randomFrom(KEYWORDS);

  const res = http.get(`${BASE_URL}/api/businesses?${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${randomToken()}` },
    tags: { name: "search_businesses" },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has businesses array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).businesses);
      } catch (e) {
        return false;
      }
    },
  });
}

export default search;
