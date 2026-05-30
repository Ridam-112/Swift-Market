import mongoose from "mongoose";
import { logger } from "./logger.js";

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI environment variable is required");

  const connect = async (attempt: number = 1): Promise<void> => {
    try {
      await mongoose.connect(uri, {
        dbName: "swiftmart",
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      isConnected = true;
      logger.info("MongoDB connected successfully");
    } catch (err) {
      logger.error({ err, attempt }, "MongoDB connection failed — retrying in 5s");
      if (attempt >= 5) {
        logger.error("MongoDB failed after 5 attempts — server continues without DB");
        return; // Don't crash — let health endpoint still respond
      }
      await new Promise((r) => setTimeout(r, 5000));
      return connect(attempt + 1);
    }
  };

  await connect();
}

export function isMongoConnected(): boolean {
  return isConnected;
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  logger.info("MongoDB reconnected");
});

export { mongoose };
