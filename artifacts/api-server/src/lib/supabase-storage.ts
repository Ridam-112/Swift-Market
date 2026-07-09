import { StorageClient } from "@supabase/storage-js";
import path from "path";
import crypto from "crypto";
import mime from "mime-types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucket      = process.env.SUPABASE_STORAGE_BUCKET ?? "swiftmart";

// Storage-only client — no Realtime/WebSocket; works on Node.js 18+
const storageUrl = `${supabaseUrl}/storage/v1`;
export const storage = new StorageClient(storageUrl, {
  apikey:        supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
});

// Derive the trusted hostname from the configured Supabase project URL.
// Only URLs originating from THIS project's storage endpoint will be deleted.
const _trustedHost = (() => {
  try { return new URL(supabaseUrl).hostname; } catch { return null; }
})();

/**
 * Upload a buffer to Supabase Storage.
 *
 * @param buffer       - File buffer to upload.
 * @param folder       - Logical folder, e.g. "swiftmart/products"
 * @param originalName - Original filename (used to derive extension/content-type)
 * @param resourceType - Ignored for API compat ("image" | "auto" | "raw")
 */
export async function uploadToSupabase(
  buffer: Buffer,
  folder: string,
  originalName = "file",
  _resourceType: "image" | "auto" | "raw" = "image",
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const ext         = path.extname(originalName).toLowerCase() || ".bin";
  const uniqueName  = `${crypto.randomUUID()}${ext}`;
  const storagePath = `${folder}/${uniqueName}`;
  const contentType = (mime.lookup(ext) || "application/octet-stream") as string;
  const detectedType = contentType.startsWith("image/") ? "image" : "raw";

  const { error } = await storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw new Error(`Supabase upload failed: ${(error as { message?: string }).message ?? String(error)}`);

  const { data } = storage.from(bucket).getPublicUrl(storagePath);

  return { url: data.publicUrl, publicId: storagePath, resourceType: detectedType };
}

/**
 * Delete a file from Supabase Storage by its public URL.
 * Skips non-Supabase URLs, local upload paths, and URLs from a different project.
 * Validates strictly against the configured project hostname and bucket path prefix.
 */
export async function deleteFromSupabase(imageUrl: string): Promise<void> {
  if (!imageUrl) return;
  if (imageUrl.startsWith("/api/uploads/")) return;

  let parsed: URL;
  try { parsed = new URL(imageUrl); } catch { return; }

  // Strict host validation — must match the exact configured Supabase project hostname
  if (!_trustedHost || parsed.hostname !== _trustedHost) return;

  // Pathname must start with the expected storage prefix
  const expectedPrefix = `/storage/v1/object/public/${bucket}/`;
  if (!parsed.pathname.startsWith(expectedPrefix)) return;

  const storagePath = parsed.pathname.slice(expectedPrefix.length);
  if (!storagePath) return;

  try {
    await storage.from(bucket).remove([storagePath]);
  } catch {
    // non-fatal — log silently
  }
}
