import "dotenv/config";
import { Client } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { Readable } from "stream";
import bcrypt from "bcryptjs";
import { placeBusiness, pickKeywords } from "./placement";

const TOTAL_USERS = Number(process.env.TOTAL_USERS ?? 100_000_000);
const TOTAL_BUSINESSES = Number(process.env.TOTAL_BUSINESSES ?? 2_000_000);
const AVG_REVIEWS_PER_BUSINESS = Number(process.env.AVG_REVIEWS_PER_BUSINESS ?? 5);
const MAX_REVIEWS_PER_BUSINESS = Number(process.env.MAX_REVIEWS_PER_BUSINESS ?? 200);
const BATCH_SIZE = Number(process.env.COPY_BATCH_SIZE ?? 50_000);

// Reused for every synthetic user — nobody logs in through the real /auth/login
// flow with these accounts, so the actual hash value is irrelevant, but the
// NOT NULL column still needs something in it. Hashing once avoids paying
// bcrypt's cost millions of times over.
const PLACEHOLDER_PASSWORD_HASH = bcrypt.hashSync("load-test-placeholder", 4);

const NOW = new Date().toISOString();

function hash01(seed: number): number {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = (x ^ (x >>> 15)) >>> 0;
  return x / 4294967296;
}

/** CSV-escape a single field per RFC4180 (only quotes when needed). */
function csvField(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvField).join(",") + "\n";
}

async function* usersRows(): AsyncGenerator<string> {
  let buffer = "";
  for (let i = 0; i < TOTAL_USERS; i++) {
    buffer += csvRow([`u_${i}`, `user${i}@loadtest.example`, PLACEHOLDER_PASSWORD_HASH, `Load Test User ${i}`, NOW]);
    if (i % BATCH_SIZE === BATCH_SIZE - 1) {
      yield buffer;
      buffer = "";
      if (i % (BATCH_SIZE * 10) === BATCH_SIZE * 10 - 1) {
        console.log(`  users: ${i + 1}/${TOTAL_USERS}`);
      }
    }
  }
  if (buffer) yield buffer;
}

async function* businessesRows(): AsyncGenerator<string> {
  let buffer = "";
  for (let i = 0; i < TOTAL_BUSINESSES; i++) {
    const placed = placeBusiness(i);
    const ownerId = `u_${i % TOTAL_USERS}`;
    const name = `${placed.city.name} ${placed.category} #${i}`;
    const description = `${pickKeywords(i).join(" ")} business for load testing`;
    const address = `Near ${placed.city.name}`;
    buffer += csvRow([
      `b_${i}`,
      ownerId,
      name,
      placed.category,
      description,
      address,
      placed.lat,
      placed.lon,
      NOW,
      NOW,
    ]);
    if (i % BATCH_SIZE === BATCH_SIZE - 1) {
      yield buffer;
      buffer = "";
      console.log(`  businesses: ${i + 1}/${TOTAL_BUSINESSES}`);
    }
  }
  if (buffer) yield buffer;
}

function reviewCountFor(businessIndex: number): number {
  const r = hash01(businessIndex * 11 + 99);
  if (r < 0.7) {
    return Math.floor(hash01(businessIndex * 11 + 100) * AVG_REVIEWS_PER_BUSINESS);
  }
  if (r < 0.95) {
    return AVG_REVIEWS_PER_BUSINESS + Math.floor(hash01(businessIndex * 11 + 101) * AVG_REVIEWS_PER_BUSINESS * 2);
  }
  const tail = AVG_REVIEWS_PER_BUSINESS * 3 + Math.floor(hash01(businessIndex * 11 + 102) * MAX_REVIEWS_PER_BUSINESS);
  return Math.min(MAX_REVIEWS_PER_BUSINESS, tail);
}

async function* reviewsRows(): AsyncGenerator<string> {
  let buffer = "";
  let rowsInBuffer = 0;
  for (let i = 0; i < TOTAL_BUSINESSES; i++) {
    const count = reviewCountFor(i);
    for (let j = 0; j < count; j++) {
      // TOTAL_USERS is always vastly larger than MAX_REVIEWS_PER_BUSINESS in any
      // realistic config (~50 users per business by design), so a plain offset
      // is enough to keep reviewers on one business distinct — no need to check.
      const userId = `u_${(i + j) % TOTAL_USERS}`;
      const rating = 1 + Math.floor(hash01(i * 13 + j * 17 + 7) * 5);
      const sentiment = rating >= 4 ? "Great experience," : rating <= 2 ? "Disappointing," : "Decent,";
      const comment = `${sentiment} ${pickKeywords(i + j, 2).join(" ")} spot.`;
      buffer += csvRow([`r_${i}_${j}`, `b_${i}`, userId, rating, comment, NOW, NOW]);
      rowsInBuffer++;
      if (rowsInBuffer >= BATCH_SIZE) {
        yield buffer;
        buffer = "";
        rowsInBuffer = 0;
      }
    }
    if (i % (BATCH_SIZE / 10 || 1) === 0) {
      console.log(`  reviews: business ${i}/${TOTAL_BUSINESSES}`);
    }
  }
  if (buffer) yield buffer;
}

async function runCopy(client: Client, sql: string, rows: AsyncGenerator<string>, label: string) {
  console.log(`Copying ${label}...`);
  const started = Date.now();
  const stream = client.query(copyFrom(sql));
  const source = Readable.from(rows, { objectMode: false });
  await new Promise<void>((resolve, reject) => {
    source.pipe(stream).on("finish", resolve).on("error", reject);
    source.on("error", reject);
  });
  console.log(`Done ${label} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log(
      `Seeding ${TOTAL_USERS.toLocaleString()} users, ${TOTAL_BUSINESSES.toLocaleString()} businesses, ` +
        `~${AVG_REVIEWS_PER_BUSINESS} reviews/business (capped at ${MAX_REVIEWS_PER_BUSINESS})`,
    );

    await runCopy(
      client,
      `COPY "User" (id, email, "passwordHash", name, "createdAt") FROM STDIN WITH (FORMAT csv)`,
      usersRows(),
      "users",
    );

    await runCopy(
      client,
      `COPY "Business" (id, "ownerId", name, category, description, address, lat, lon, "createdAt", "updatedAt") FROM STDIN WITH (FORMAT csv)`,
      businessesRows(),
      "businesses",
    );

    await runCopy(
      client,
      `COPY "Review" (id, "businessId", "userId", rating, comment, "createdAt", "updatedAt") FROM STDIN WITH (FORMAT csv)`,
      reviewsRows(),
      "reviews",
    );

    console.log("Seed complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
