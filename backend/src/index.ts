import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import navigateRouter from "./routes/navigate";
import businessesRouter from "./routes/businesses";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/navigate", navigateRouter);
app.use("/api/businesses", businessesRouter);

app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`navi-app backend listening on http://localhost:${port}`);
});
