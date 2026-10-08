import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth";
import fileRoutes from "./routes/files";
import folderRoutes from "./routes/folders";
import activityRoutes from "./routes/activity";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/activity", activityRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CloudVault API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "CloudVault API is running",
  });
});

app.use(errorHandler);

export default app;
