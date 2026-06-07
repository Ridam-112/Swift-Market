import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../../middlewares/auth.js";
import { uploadToCloudinary } from "../../lib/cloudinary.js";

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
  imageUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/products");
    res.json({ success: true, imageUrl: url });
  },
);

router.post(
  "/banner-image",
  authenticate,
  imageUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/banners");
    res.json({ success: true, imageUrl: url });
  },
);

router.post(
  "/shop-image",
  authenticate,
  imageUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/shops");
    res.json({ success: true, imageUrl: url });
  },
);

router.post(
  "/certificate",
  authenticate,
  certificateUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/certificates");
    res.json({ success: true, fileUrl: url });
  },
);

export default router;
