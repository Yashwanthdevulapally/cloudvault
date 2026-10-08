import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env", override: true });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5001),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  REDIS_URL: z
    .string()
    .min(1, "REDIS_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),

  AWS_REGION: z
    .string()
    .min(1, "AWS_REGION is required"),

  AWS_ACCESS_KEY_ID: z
    .string()
    .min(1, "AWS_ACCESS_KEY_ID is required"),

  AWS_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "AWS_SECRET_ACCESS_KEY is required"),

  AWS_S3_BUCKET_NAME: z
    .string()
    .min(1, "AWS_S3_BUCKET_NAME is required"),

  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration:");

  for (const issue of parsedEnv.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

export const env = parsedEnv.data;
