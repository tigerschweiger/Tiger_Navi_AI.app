"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Prisma's default pool size (num_physical_cpus * 2 + 1) is tuned for a
// generic workload, not for a read-heavy API under load — DB_POOL_SIZE lets
// each process's pool be sized deliberately (and coordinated with
// CLUSTER_WORKERS in index.ts so workers * poolSize stays under Postgres's
// max_connections).
function withPoolSize(url, poolSize) {
    const parsed = new URL(url);
    parsed.searchParams.set("connection_limit", String(poolSize));
    parsed.searchParams.set("pool_timeout", "20");
    return parsed.toString();
}
const poolSize = Number(process.env.DB_POOL_SIZE ?? 10);
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: { url: withPoolSize(process.env.DATABASE_URL, poolSize) },
    },
});
