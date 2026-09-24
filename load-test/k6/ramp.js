import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";
import exec from "k6/execution";
import { weightedCity, bboxAround, randomToken, parseServerTiming } from "./lib/data.js";

// Diagnostic script, not a load-shape test: search-only, held flat at each
// concurrency level for 25s at a time, stepping through VU levels so the
// summary shows exactly which step latency and http_req_failed start
// blowing up at, instead of just "it's fine at 50 and broken at 5400" with
// nothing in between.
//
// MAX_VU caps how high the ramp goes (default: no cap, runs the full list).
// e.g. MAX_VU=3500 stops after the 3500 step instead of continuing to 5400 —
// use this to test a specific target band without also triggering whatever
// higher-level failure cliff sits above it.
const serverDuration = new Trend("server_duration", true);

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

const ALL_LEVELS = [200, 500, 1000, 2000, 3500, 5400];
const SMOKE_LEVELS = [20, 50, 100];

const maxVU = __ENV.MAX_VU ? Number(__ENV.MAX_VU) : Infinity;
const levels = (__ENV.SMOKE ? SMOKE_LEVELS : ALL_LEVELS).filter((v) => v <= maxVU);

if (levels.length === 0) {
  throw new Error(
    `MAX_VU=${__ENV.MAX_VU} is below the smallest level (${(__ENV.SMOKE ? SMOKE_LEVELS : ALL_LEVELS)[0]}) — nothing to run.`,
  );
}

// Ramp duration to reach a step, hold duration once there, per level.
const RAMP_SEC = 5;
const HOLD_SEC = __ENV.SMOKE ? 10 : 25;
const RAMPDOWN_SEC = __ENV.SMOKE ? 10 : 20;
const PER_LEVEL_SEC = RAMP_SEC + HOLD_SEC;

// { untilSec, target } — untilSec is cumulative elapsed time (ramp + hold)
// at which this step ends.
const steps = levels.map((target, i) => ({
  untilSec: (i + 1) * PER_LEVEL_SEC,
  target,
}));

const stages = [];
for (const target of levels) {
  stages.push({ duration: `${RAMP_SEC}s`, target });
  stages.push({ duration: `${HOLD_SEC}s`, target });
}
stages.push({ duration: `${RAMPDOWN_SEC}s`, target: 0 });

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
      stages,
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
