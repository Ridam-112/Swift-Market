import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalApiLimiter } from "./middlewares/rateLimiter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Security headers — applied before CORS so headers are always present
app.use(helmet({
  // Allow the frontend to embed the app in iframes on the same origin (Replit canvas)
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env["ALLOWED_ORIGINS"]?.split(",").map(o => o.trim()).filter(Boolean) ?? [];
app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests (server-to-server, curl) and all origins in dev
    if (!origin || process.env["NODE_ENV"] !== "production") return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(express.json({
  verify: (req, _res, buf) => {
    // Capture raw body for Razorpay webhook signature verification (M6)
    if ((req as Request & { url?: string }).url?.includes("/payments/webhook")) {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use("/api/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api", globalApiLimiter, router);

// In production: serve the built React frontend and handle SPA routing
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "..", "..", "swiftmart", "dist", "public");
  app.use(express.static(frontendDist));
  app.get("/{*splat}", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
