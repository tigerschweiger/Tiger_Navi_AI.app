import http from "k6/http";
import { check } from "k6";
import { randomToken, randomBusiness } from "./lib/data.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

const fullStages = [
  { duration: "30s", target: 50 },
  { duration: "1m", target: 50 },
  { duration: "30s", target: 500 },
  { duration: "1m", target: 500 },
  { duration: "30s", target: 0 },
];

const smokeStages = [
  { duration: "10s", target: 5 },
  { duration: "20s", target: 20 },
  { duration: "10s", target: 0 },
];

export const options = {
  scenarios: {
    detail: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: __ENV.SMOKE ? smokeStages : fullStages,
      exec: "detail",
    },
  },
  thresholds: {
    http_req_duration: ["p(50)<300", "p(95)<800", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

export function detail() {
  const business = randomBusiness();

  const res = http.get(`${BASE_URL}/api/businesses/${business.id}`, {
    headers: { Authorization: `Bearer ${randomToken()}` },
    tags: { name: "business_detail" },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has business object": (r) => {
      try {
        return typeof JSON.parse(r.body).business === "object";
      } catch (e) {
        return false;
      }
    },
  });
}

export default detail;
