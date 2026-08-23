// Combined scenario: search dominates (browsing/searching), detail is a
// smaller share (opening a few results), review is a small write slice on
// top — closer to how real traffic mixes than running any one endpoint
// in isolation. Writes stay ~10% of the search scenario's VU count, since
// posting a review is rare next to browsing/searching in real usage.
export { search } from "./search.js";
export { detail } from "./detail.js";
export { review } from "./review.js";

const fullSearchStages = [
  { duration: "30s", target: 80 },
  { duration: "1m", target: 80 },
  { duration: "30s", target: 800 },
  { duration: "1m", target: 800 },
  { duration: "30s", target: 4000 },
  { duration: "2m", target: 4000 },
  { duration: "30s", target: 0 },
];

const fullDetailStages = [
  { duration: "30s", target: 20 },
  { duration: "1m", target: 20 },
  { duration: "30s", target: 200 },
  { duration: "1m", target: 200 },
  { duration: "30s", target: 1000 },
  { duration: "2m", target: 1000 },
  { duration: "30s", target: 0 },
];

const fullReviewStages = [
  { duration: "30s", target: 8 },
  { duration: "1m", target: 8 },
  { duration: "30s", target: 80 },
  { duration: "1m", target: 80 },
  { duration: "30s", target: 400 },
  { duration: "2m", target: 400 },
  { duration: "30s", target: 0 },
];

const smokeSearchStages = [
  { duration: "10s", target: 8 },
  { duration: "20s", target: 40 },
  { duration: "10s", target: 0 },
];

const smokeDetailStages = [
  { duration: "10s", target: 2 },
  { duration: "20s", target: 10 },
  { duration: "10s", target: 0 },
];

const smokeReviewStages = [
  { duration: "10s", target: 1 },
  { duration: "20s", target: 4 },
  { duration: "10s", target: 0 },
];

export const options = {
  scenarios: {
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeSearchStages : fullSearchStages,
      exec: "search",
    },
    detail: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeDetailStages : fullDetailStages,
      exec: "detail",
    },
    review: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeReviewStages : fullReviewStages,
      exec: "review",
    },
  },
  thresholds: {
    "http_req_duration{name:search_businesses}": ["p(50)<300", "p(95)<800", "p(99)<1000"],
    "http_req_duration{name:business_detail}": ["p(50)<300", "p(95)<800", "p(99)<1000"],
    "http_req_duration{name:post_review}": ["p(50)<300", "p(95)<800", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};
