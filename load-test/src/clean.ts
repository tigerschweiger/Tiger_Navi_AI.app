import "dotenv/config";
import { Client } from "pg";

// Synthetic rows are always prefixed r_ / b_ / u_, so this can never touch
// real data (Prisma's own @default(uuid()) ids never take this shape).
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log("Deleting synthetic reviews...");
    console.log((await client.query(`DELETE FROM "Review" WHERE id LIKE 'r\\_%' ESCAPE '\\'`)).rowCount, "deleted");

    console.log("Deleting synthetic businesses...");
    console.log((await client.query(`DELETE FROM "Business" WHERE id LIKE 'b\\_%' ESCAPE '\\'`)).rowCount, "deleted");

    console.log("Deleting synthetic users...");
    console.log((await client.query(`DELETE FROM "User" WHERE id LIKE 'u\\_%' ESCAPE '\\'`)).rowCount, "deleted");

    console.log("Clean complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
