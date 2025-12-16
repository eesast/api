import cron from "node-cron";
import redis from "./redis";
import { set_user_llm_usage } from "../hasura/llm";

export const llm_cron = () => {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("Starting LLM usage sync...");
    let cursor = "0";
    do {
      // Scan for usage keys
      const result = await redis.scan(
        cursor,
        "MATCH",
        "llm_usage:*",
        "COUNT",
        "100",
      );
      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        try {
          const studentNo = key.split(":")[1];
          const usageStr = await redis.get(key);
          if (usageStr) {
            const usage = parseInt(usageStr);
            await set_user_llm_usage(studentNo, usage);
          }
        } catch (e) {
          console.error(`Failed to sync usage for key ${key}:`, e);
        }
      }
    } while (cursor !== "0");
    console.log("LLM usage sync completed.");
  });
};
