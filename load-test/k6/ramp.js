import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";
import { weightedCity, bboxAround, randomToken, parseServerTiming } from "./lib/data.js";

// Diagnostic script, not a load-shape test: search-only, held flat at each
// concurrency level for 25s at a time, stepping 200 -> 500 -> 1000 -> 2000
// -> 3500 -> 5400 VUs, so the summary shows exactly which step latency and
// http_req_failed start blowing up at, instead of just "it's fine at 50 and
// broken at 5400" with nothing in between.
const serverDuration = new Trend("server_duration", true);

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

// { untilSec, target } — untilSec is cumulative elapsed time (ramp + hold)
// at which this step ends. Keep in sync with `fullStages` below.
const STEPS = [
  { untilSec: 30, target: 200 },
  { untilSec: 60, target: 500 },
  { untilSec: 90, target: 1000 },
  { untilSec: 120, target: 2000 },
  { untilSec: 150, target: 3500 },
  { untilSec: 180, target: 5400 },
];

const fullStages = [
  { duration: "5s", target: 200 },
  { duration: "25s", target: 200 },
  { duration: "5s", target: 500 },
  { duration: "25s", target: 500 },
  { duration: "5s", target: 1000 },
  { duration: "25s", target: 1000 },
  { duration: "5s", target: 2000 },
  { duration: "25s", target: 2000 },
  { duration: "5s", target: 3500 },
  { duration: "25s", target: 3500 },
  { duration: "5s", target: 5400 },
  { duration: "25s", target: 5400 },
  { duration: "20s", target: 0 },
];

const smokeSteps = [
  { untilSec: 15, target: 20 },
  { untilSec: 30, target: 50 },
  { untilSec: 45, target: 100 },
];

const smokeStages = [
  { duration: "5s", target: 20 },
  { duration: "10s", target: 20 },
  { duration: "5s", target: 50 },
  { duration: "10s", target: 50 },
  { duration: "5s", target: 100 },
  { duration: "10s", target: 100 },
  { duration: "10s", target: 0 },
];

const steps = __ENV.SMOKE ? smokeSteps : STEPS;

function stepLabel() {
  const elapsedSec = exec.instance.currentTestRunDuration / 1000;
  for (const step of steps) {
    if (elapsedSec < step.untilSec) return `vu_${step.target}`;
  }
  return "rampdown";
}

// Trivially-true thresholds per step, purely so k6 prints these tagged
// sub-metrics in the end-of-run summary instead of only the flat aggregate —
// that per-step breakdown is the entire point of this script.
const thresholds = { http_req_failed: ["rate<=1"] };
for (const step of steps) {
  const tag = `vu_${step.target}`;
  thresholds[`http_req_duration{step:${tag}}`] = ["max>=0"];
  thresholds[`http_req_failed{step:${tag}}`] = ["rate<=1"];
  thresholds[`server_duration{step:${tag}}`] = ["max>=0"];
}

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeStages : fullStages,
      exec: "ramp",
    },
  },
  thresholds,
};

export function ramp() {
  const city = weightedCity();
  const bbox = bboxAround(city);
  const step = stepLabel();

  const res = http.get(
    `${BASE_URL}/api/businesses?minLat=${bbox.minLat.toFixed(6)}&minLon=${bbox.minLon.toFixed(6)}&maxLat=${bbox.maxLat.toFixed(6)}&maxLon=${bbox.maxLon.toFixed(6)}`,
    {
      headers: { Authorization: `Bearer ${randomToken()}` },
      tags: { name: "search_businesses", step },
    },
  );

  const serverMs = parseServerTiming(res);
  if (serverMs !== null) serverDuration.add(serverMs, { step });

  check(res, { "status is 200": (r) => r.status === 200 });
}

export default ramp;
