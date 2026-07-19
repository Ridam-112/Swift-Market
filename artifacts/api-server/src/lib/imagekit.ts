import ImageKit from "imagekit";
import path from "path";
import crypto from "crypto";

const publicKey  = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

let _ik: ImageKit | null = null;
function getIK(): ImageKit {
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      "IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT must be set to use image storage",
    );
  }
  if (!_ik) {
    _ik = new ImageKit({ publicKey, privateKey, urlEndpoint });
  }
  return _ik;
}

// Derive the trusted ImageKit hostname for safe deletion checks
const _trustedEndpointHost = (() => {
  try { return urlEndpoint ? new URL(urlEndpoint).hostname : null; } catch { return null; }
})();

/**
 * Upload a buffer to ImageKit.
 *
 * @param buffer       - File buffer to upload.
 * @param folder       - Logical folder, e.g. "swiftmart/products"
 * @param originalName - Original filename (used to derive extension/content-type)
 * @param _resourceType - Ignored for API compat ("image" | "auto" | "raw")
 */
export async function uploadToImageKit(
  buffer: Buffer,
  folder: string,
  originalName = "file",
  _resourceType: "image" | "auto" | "raw" = "image",
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const ext        = path.extname(originalName).toLowerCase() || ".bin";
  const uniqueName = `${crypto.randomUUID()}${ext}`;

  const result = await getIK().upload({
    file: buffer,
    fileName: uniqueName,
    folder,
    useUniqueFileName: false, // we already generate a UUID name
  });

  const resourceType = result.fileType === "image" ? "image" : "raw";
  return { url: result.url, publicId: result.fileId, resourceType };
}

/**
 * Delete a file from ImageKit by its public URL.
 * Skips non-ImageKit URLs and URLs from a different endpoint host.
 */
export async function deleteFromImageKit(imageUrl: string): Promise<void> {
  if (!imageUrl) return;
  if (imageUrl.startsWith("/api/uploads/")) return;

  let parsed: URL;
  try { parsed = new URL(imageUrl); } catch { return; }

  // Only delete from our configured ImageKit endpoint host
  if (!_trustedEndpointHost || parsed.hostname !== _trustedEndpointHost) return;

  try {
    // ImageKit delete requires the fileId, not the URL.
    // We store fileId as publicId — but for URLs we must search by URL to get the fileId.
    const ik = getIK();
    const files = await ik.listFiles({ searchQuery: `url = "${imageUrl}"`, limit: 1 });
    if (!files || files.length === 0) return;
    const fileId = (files[0] as { fileId: string }).fileId;
    if (fileId) await ik.deleteFile(fileId);
  } catch {
    // non-fatal — log silently
  }
}
