import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export function extractPublicId(cloudinaryUrl: string): string | null {
  const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match?.[1] ?? null;
}

export async function deleteFromCloudinary(imageUrl: string): Promise<void> {
  if (!imageUrl) return;
  if (imageUrl.startsWith("/api/uploads/")) return;
  if (!imageUrl.includes("cloudinary.com")) return;
  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // non-fatal — log silently
  }
}

export { cloudinary };
