import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../../middlewares/auth.js";
import { uploadToSupabase } from "../../lib/supabase-storage.js";


const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only JPG, PNG, or WEBP images are allowed"));
  },
});

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP, or PDF files are allowed"));
  },
});

/**
 * Run a multer middleware as a promise so errors are caught inline
 * instead of bubbling to Express's global error handler (which returns 500).
 */
function runMulter(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

router.post(
  "/product-image",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await runMulter(imageUpload.single("image"), req, res);
    } catch (err) {
      const isMulterLimit = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      const msg = isMulterLimit
        ? "Image is too large. Maximum size is 5 MB."
        : err instanceof Error ? err.message : "Invalid file";
      res.status(400).json({ success: false, message: msg });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    try {
      const { url } = await uploadToSupabase(req.file.buffer, "swiftmart/products", req.file.originalname);
      res.json({ success: true, imageUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

router.post(
  "/banner-image",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await runMulter(imageUpload.single("image"), req, res);
    } catch (err) {
      const isMulterLimit = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      const msg = isMulterLimit
        ? "Image is too large. Maximum size is 5 MB."
        : err instanceof Error ? err.message : "Invalid file";
      res.status(400).json({ success: false, message: msg });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    try {
      const { url } = await uploadToSupabase(req.file.buffer, "swiftmart/banners", req.file.originalname);
      res.json({ success: true, imageUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

router.post(
  "/shop-image",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await runMulter(imageUpload.single("image"), req, res);
    } catch (err) {
      const isMulterLimit = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      const msg = isMulterLimit
        ? "Image is too large. Maximum size is 5 MB."
        : err instanceof Error ? err.message : "Invalid file";
      res.status(400).json({ success: false, message: msg });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    try {
      const { url } = await uploadToSupabase(req.file.buffer, "swiftmart/shops", req.file.originalname);
      res.json({ success: true, imageUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

router.post(
  "/certificate",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await runMulter(certificateUpload.single("file"), req, res);
    } catch (err) {
      const isMulterLimit = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      const msg = isMulterLimit
        ? "File is too large. Maximum size is 10 MB."
        : err instanceof Error ? err.message : "Invalid file";
      res.status(400).json({ success: false, message: msg });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    try {
      const { url } = await uploadToSupabase(req.file.buffer, "swiftmart/certificates", req.file.originalname, "auto");
      res.json({ success: true, fileUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

export default router;
