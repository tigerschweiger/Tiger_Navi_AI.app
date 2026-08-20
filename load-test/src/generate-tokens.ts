import "dotenv/config";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { CITIES } from "./cities";
import { placeBusiness } from "./placement";

const JWT_SECRET = process.env.JWT_SECRET as string;
const TOTAL_USERS = Number(process.env.TOTAL_USERS ?? 100_000_000);
const TOTAL_BUSINESSES = Number(process.env.TOTAL_BUSINESSES ?? 2_000_000);
const TOKEN_POOL_SIZE = Number(process.env.TOKEN_POOL_SIZE ?? 20_000);
const TOKEN_TTL = (process.env.TOKEN_TTL ?? "30d") as jwt.SignOptions["expiresIn"];
const BUSINESS_SAMPLE_SIZE = Number(process.env.BUSINESS_SAMPLE_SIZE ?? 5_000);

const OUT_DIR = path.join(__dirname, "..", "k6", "data");

function main() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set — it must match backend/.env's JWT_SECRET.");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Token pool size is independent of TOTAL_USERS on purpose — a load test needs
  // enough tokens to cover its target peak concurrency, not one per registered user.
  console.log(`Signing ${TOKEN_POOL_SIZE.toLocaleString()} tokens...`);
  const step = Math.max(1, Math.floor(TOTAL_USERS / TOKEN_POOL_SIZE));
  const tokens: string[] = [];
  for (let k = 0; k < TOKEN_POOL_SIZE; k++) {
    const userIndex = (k * step) % TOTAL_USERS;
    tokens.push(jwt.sign({ userId: `u_${userIndex}` }, JWT_SECRET, { expiresIn: TOKEN_TTL }));
  }
  fs.writeFileSync(path.join(OUT_DIR, "tokens.json"), JSON.stringify(tokens));
  console.log(`Wrote ${tokens.length} tokens.`);

  console.log("Writing city list...");
  fs.writeFileSync(path.join(OUT_DIR, "cities.json"), JSON.stringify(CITIES));

  console.log(`Sampling ${BUSINESS_SAMPLE_SIZE.toLocaleString()} businesses for detail lookups...`);
  const bizStep = Math.max(1, Math.floor(TOTAL_BUSINESSES / BUSINESS_SAMPLE_SIZE));
  const sample: { id: string; lat: number; lon: number }[] = [];
  for (let k = 0; k < BUSINESS_SAMPLE_SIZE; k++) {
    const index = (k * bizStep) % TOTAL_BUSINESSES;
    const placed = placeBusiness(index);
    sample.push({ id: `b_${index}`, lat: placed.lat, lon: placed.lon });
  }
  fs.writeFileSync(path.join(OUT_DIR, "businesses-sample.json"), JSON.stringify(sample));
  console.log(`Wrote ${sample.length} sampled business ids.`);

  console.log(`Done. Output in ${OUT_DIR}`);
}

main();
