const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_COMPRESSION_QUALITY = 0.8;

/** Downscales/re-encodes large receipt photos before they're stored in IndexedDB,
 * since phone camera photos can easily be 5-10MB and would otherwise bloat browser storage. */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/webp') {
    // WebP re-encoding via canvas.toBlob is inconsistent across browsers; pass through untouched.
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 1_000_000) {
      bitmap.close?.();
      return file; // already small enough
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESSION_QUALITY)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    // If compression fails for any reason, fall back to storing the original file.
    return file;
  }
}
