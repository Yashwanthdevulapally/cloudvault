import Redis from "ioredis";
import { env } from "../config/env";

const redis = new Redis(env.REDIS_URL);

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (error) => {
  console.error("❌ Redis error:", error);
});

export default redis;
