import "dotenv/config";
import cluster from "cluster";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import navigateRouter from "./routes/navigate";
import businessesRouter from "./routes/businesses";
import { errorHandler } from "./middleware/errorHandler";

// Single Node process = single core, no matter how big the connection pool
// is. CLUSTER_WORKERS forks N worker processes (each with its own DB pool
// sized via DB_POOL_SIZE) so the app tier actually uses more than one core.
// Defaults to 1 (today's behavior, unchanged) — opt in explicitly for load
// tests / production: CLUSTER_WORKERS=8 npm start.
const numWorkers = Number(process.env.CLUSTER_WORKERS ?? 1);

if (numWorkers > 1 && cluster.isPrimary) {
  console.log(`Primary ${process.pid} forking ${numWorkers} workers`);
  for (let i = 0; i < numWorkers; i++) cluster.fork();
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} exited (${signal ?? code}), forking a replacement`);
    cluster.fork();
  });
} else {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok", pid: process.pid }));
  app.use("/api/auth", authRouter);
  app.use("/api/navigate", navigateRouter);
  app.use("/api/businesses", businessesRouter);

  app.use(errorHandler);

  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`navi-app backend (pid ${process.pid}) listening on http://localhost:${port}`);
  });
}
