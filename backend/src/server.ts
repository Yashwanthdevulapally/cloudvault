import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import fileRoutes from "./routes/files";
import folderRoutes from "./routes/folders";
import activityRoutes from "./routes/activity";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/activity", activityRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "CloudVault API is running",
  });
});

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
  console.log(`CloudVault server running on http://localhost:${PORT}`);
});