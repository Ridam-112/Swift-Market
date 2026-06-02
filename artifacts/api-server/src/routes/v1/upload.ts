import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../../middlewares/auth.js";
import { uploadToCloudinary } from "../../lib/cloudinary.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only jpg, jpeg, png, webp images are allowed"));
  },
});

router.post(
  "/product-image",
  authenticate,
  upload.single("image"),
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
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, "swiftmart/banners");
    res.json({ success: true, imageUrl: url });
  },
);

export default router;
