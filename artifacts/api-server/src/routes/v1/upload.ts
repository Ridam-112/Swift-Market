import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../../middlewares/auth.js";
import { uploadToImageKit } from "../../lib/imagekit.js";


const router = Router();

// Validate both file extension AND MIME type to prevent bypass via renamed files
const ALLOWED_IMAGE_EXTS  = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const ALLOWED_IMAGE_MIME  = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const ALLOWED_MEDIA_EXTS  = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mov", ".mkv", ".json", ".lottie"]);
const ALLOWED_MEDIA_MIME  = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
  "application/json", "text/plain", "application/octet-stream"
]);
const ALLOWED_CERT_EXTS   = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const ALLOWED_CERT_MIME   = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_EXTS.has(ext) && (ALLOWED_IMAGE_MIME.has(file.mimetype) || file.mimetype.startsWith("image/"))) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP, GIF, or SVG images are allowed"));
    }
  },
});

const bannerMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video / lottie
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      ALLOWED_MEDIA_EXTS.has(ext) ||
      ALLOWED_MEDIA_MIME.has(file.mimetype) ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("image/") ||
      ext === ".json" ||
      ext === ".lottie"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Image, Video (MP4/WebM), GIF, or Lottie/JSON animation files are allowed"));
    }
  },
});

const certificateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_CERT_EXTS.has(ext) && ALLOWED_CERT_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP, or PDF files are allowed"));
    }
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
        ? "Image is too large. Maximum size is 10 MB."
        : err instanceof Error ? err.message : "Invalid file";
      res.status(400).json({ success: false, message: msg });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    try {
      const { url } = await uploadToImageKit(req.file.buffer, "swiftmart/products", req.file.originalname);
      res.json({ success: true, imageUrl: url, url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

const handleBannerUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    // Try "image", "video", "file", or "media" field names seamlessly
    const uploadMiddleware = (req.is("multipart/form-data"))
      ? bannerMediaUpload.fields([
          { name: "image", maxCount: 1 },
          { name: "video", maxCount: 1 },
          { name: "file", maxCount: 1 },
          { name: "media", maxCount: 1 },
        ])
      : bannerMediaUpload.single("image");

    await runMulter(uploadMiddleware, req, res);
  } catch (err) {
    const isMulterLimit = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
    const msg = isMulterLimit
      ? "Media file is too large. Maximum size is 50 MB."
      : err instanceof Error ? err.message : "Invalid file";
    res.status(400).json({ success: false, message: msg });
    return;
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const file =
    req.file ||
    (files?.["image"]?.[0]) ||
    (files?.["video"]?.[0]) ||
    (files?.["file"]?.[0]) ||
    (files?.["media"]?.[0]);

  if (!file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }

  try {
    const { url } = await uploadToImageKit(file.buffer, "swiftmart/banners", file.originalname, "auto");
    res.json({
      success: true,
      imageUrl: url,
      videoUrl: url,
      fileUrl: url,
      url: url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    res.status(502).json({ success: false, message: msg });
  }
};

router.post("/banner-image", authenticate, handleBannerUpload);
router.post("/banner-media", authenticate, handleBannerUpload);

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
      const { url } = await uploadToImageKit(req.file.buffer, "swiftmart/shops", req.file.originalname);
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
      const { url } = await uploadToImageKit(req.file.buffer, "swiftmart/certificates", req.file.originalname, "auto");
      res.json({ success: true, fileUrl: url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ success: false, message: msg });
    }
  },
);

export default router;
