import http from "k6/http";
import { check } from "k6";
import { randomToken, randomBusiness } from "./lib/data.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

// Writes are a small share of real traffic (posting a review is rare next to
// browsing/searching) — kept modest here on purpose, see mixed.js for the
// weighting relative to the read scenarios.
const fullStages = [
  { duration: "30s", target: 10 },
  { duration: "1m", target: 10 },
  { duration: "30s", target: 100 },
  { duration: "1m", target: 100 },
  { duration: "30s", target: 0 },
];

const smokeStages = [
  { duration: "10s", target: 2 },
  { duration: "20s", target: 10 },
  { duration: "10s", target: 0 },
];

export const options = {
  scenarios: {
    review: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeStages : fullStages,
      exec: "review",
    },
  },
  thresholds: {
    http_req_duration: ["p(50)<300", "p(95)<800", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

const COMMENTS = [
  "Great experience, would come back.",
  "Decent, nothing special.",
  "Disappointing service this time.",
  "Really enjoyed it, highly recommend.",
  "Average, met expectations.",
];

export function review() {
  const business = randomBusiness();
  const payload = JSON.stringify({
    rating: 1 + Math.floor(Math.random() * 5),
    comment: COMMENTS[Math.floor(Math.random() * COMMENTS.length)],
  });

  // Upsert semantics on the API (one review per user per business) keep this
  // bounded — the review table can grow at most to (token pool size x
  // sampled business count) rows, not one row per request, however long the
  // test runs.
  const res = http.post(`${BASE_URL}/api/businesses/${business.id}/reviews`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${randomToken()}`,
    },
    tags: { name: "post_review" },
  });

  check(res, {
    "status is 201": (r) => r.status === 201,
  });
}

export default review;
