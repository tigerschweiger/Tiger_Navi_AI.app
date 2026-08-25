"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cluster_1 = __importDefault(require("cluster"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const navigate_1 = __importDefault(require("./routes/navigate"));
const businesses_1 = __importDefault(require("./routes/businesses"));
const errorHandler_1 = require("./middleware/errorHandler");
// Single Node process = single core, no matter how big the connection pool
// is. CLUSTER_WORKERS forks N worker processes (each with its own DB pool
// sized via DB_POOL_SIZE) so the app tier actually uses more than one core.
// Defaults to 1 (today's behavior, unchanged) — opt in explicitly for load
// tests / production: CLUSTER_WORKERS=8 npm start.
const numWorkers = Number(process.env.CLUSTER_WORKERS ?? 1);
if (numWorkers > 1 && cluster_1.default.isPrimary) {
    console.log(`Primary ${process.pid} forking ${numWorkers} workers`);
    for (let i = 0; i < numWorkers; i++)
        cluster_1.default.fork();
    cluster_1.default.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited (${signal ?? code}), forking a replacement`);
        cluster_1.default.fork();
    });
}
else {
    const app = (0, express_1.default)();
    // Stamps every response with how long *this process* spent on it, via the
    // standard Server-Timing header (`Server-Timing: app;dur=<ms>`). Measured
    // with a monotonic clock entirely inside this Node process, so it never
    // includes network transit time between client and server — that's the
    // whole point: a client-side tool like k6 can only measure round-trip time
    // (network + server both baked in); this is the piece that isn't network.
    // Registered first so it wraps body parsing + routing + everything else.
    app.use((_req, res, next) => {
        const start = process.hrtime.bigint();
        const originalEnd = res.end.bind(res);
        res.end = ((...args) => {
            if (!res.headersSent) {
                const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
                res.setHeader("Server-Timing", `app;dur=${durationMs.toFixed(2)}`);
            }
            return originalEnd(...args);
        });
        next();
    });
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get("/api/health", (_req, res) => res.json({ status: "ok", pid: process.pid }));
    app.use("/api/auth", auth_1.default);
    app.use("/api/navigate", navigate_1.default);
    app.use("/api/businesses", businesses_1.default);
    app.use(errorHandler_1.errorHandler);
    const port = Number(process.env.PORT) || 4000;
    app.listen(port, () => {
        console.log(`navi-app backend (pid ${process.pid}) listening on http://localhost:${port}`);
    });
}
