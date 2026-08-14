// Vercel Serverless Function Entrypoint
import app from "../src/app.js";

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Internal serverless error", error: err?.message || String(err) });
    }
  }
}
