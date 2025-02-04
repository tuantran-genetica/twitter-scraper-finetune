import dotenv from "dotenv";
dotenv.config();

import TwitterPipeline from "./TwitterPipeline.js";
import Logger from "./Logger.js";
import Db from "./Db.js";
import { sleep } from "openai/core.mjs";
import cron from "node-cron";

process.on("unhandledRejection", (error) => {
  Logger.error(`❌ Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  Logger.error(`❌ Uncaught exception: ${error.message}`);
  process.exit(1);
});

const runJob = async () => {
  const db = new Db();
  await db.initialize().catch(() => process.exit(1));

  const users = await db.listUsers();

  if (users.length === 0) {
    Logger.error("❌ No users found in the database. Exiting...");
    process.exit(1);
  }

  Logger.info(`👥 Found ${users.length} user(s) in the database`);

  const cleanup = async () => {
    Logger.warn("\n🛑 Received termination signal. Cleaning up...");
    try {
      if (pipeline.scraper) {
        await pipeline.scraper.logout();
        Logger.success("🔒 Logged out successfully.");
      }
    } catch (error) {
      Logger.error(`❌ Error during cleanup: ${error.message}`);
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  for (let i = 0; i < users.length; i++) {
    Logger.info(`🚀 Running pipeline for @${users[i].username}...`);
    const pipeline = new TwitterPipeline(users[i].username, db);
    await pipeline.run().catch(() => process.exit(1));

    Logger.info(`🕒 Waiting 5 seconds before running the next pipeline...`);
    await sleep(15000);
  }
};

const formatCurrentTime = () => {
  const now = new Date();
  return now.toISOString().replace("T", " ").substring(0, 19);
};

Logger.info(`📝 Server started at: ${formatCurrentTime()} UTC`);

// Schedule the job to run every 3 hours
cron.schedule("0 */3 * * *", () => {
  Logger.info("⏰ Starting scheduled job...");
  runJob();
});
