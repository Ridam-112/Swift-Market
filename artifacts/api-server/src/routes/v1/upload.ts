import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../../middlewares/auth.js";
import { uploadToCloudinary } from "../../lib/cloudinary.js";
import { uploadLimiter } from "../../middlewares/rateLimiter.js";

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only jpg, jpeg, png, webp images are allowed"));
  },
});

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only jpg, jpeg, png, webp, pdf files are allowed"));
  },
});

router.post(
  "/product-image",
  authenticate,
  uploadLimiter,
  imageUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    try {
      const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/products");
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
  uploadLimiter,
  imageUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    try {
      const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/banners");
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
  uploadLimiter,
  imageUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    try {
      const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/shops");
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
  uploadLimiter,
  certificateUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    try {
      const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/certificates", "auto");
      res.json({ success: true, fileUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

export default router;
