import redis from "./redis";

export async function invalidateStorageCache(userId: number) {
  await redis.del("storage:stats:" + userId);
}
