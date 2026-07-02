/**
 * Compresses an image file client-side using the Canvas API.
 * If the file is already under maxSizeMB, it is returned unchanged.
 * Otherwise it is scaled down (max 1920 px on longest side) and
 * JPEG quality is stepped down until the blob fits under maxSizeMB.
 */
export async function compressIfNeeded(file: File, maxSizeMB = 4.5): Promise<File> {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxBytes) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_DIM = 1920;
      let { naturalWidth: w, naturalHeight: h } = img;

      if (w > MAX_DIM || h > MAX_DIM) {
        if (w >= h) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      let quality = 0.88;

      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= maxBytes || quality <= 0.1) {
              const ext = file.name.replace(/\.[^.]+$/, "") + ".jpg";
              resolve(new File([blob], ext, { type: "image/jpeg" }));
            } else {
              quality = Math.max(0.1, quality - 0.1);
              attempt();
            }
          },
          "image/jpeg",
          quality,
        );
      };

      attempt();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
