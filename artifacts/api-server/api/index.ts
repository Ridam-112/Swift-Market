// Vercel Serverless Function Entrypoint
import app from "../src/app.js";
import { connectRedis } from "../src/lib/cache.js";

// Optional: Connect to Redis if configured
connectRedis();

export default app;
