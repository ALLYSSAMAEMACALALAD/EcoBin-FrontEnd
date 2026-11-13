/**
 * Downscales/compresses a camera or gallery photo to a web-friendly JPEG
 * (max 1600 px on the long edge, quality 0.85). Typical phone photos drop
 * from 4–8 MB to a few hundred KB, which keeps uploads under every limit
 * (framework guard, PHP upload_max_filesize, and slow mobile networks).
 * Returns the original file when it is already small or cannot be decoded.
 */
const MAX_DIMENSION = 1600;
const QUALITY = 0.85;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;

export async function compressImage(file) {
  if (!file) return file;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || 'photo.jpg').toLowerCase();
  const looksHeic = /heic|heif/.test(type) || /\.(heic|heif)$/.test(name);

  // Already small enough and browser-readable: keep as-is.
  if (file.size <= SKIP_BELOW_BYTES && !looksHeic) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (typeof bitmap.close === 'function') bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) return file;

    const stem = (file.name || 'photo').replace(/\.[a-z0-9]+$/i, '') || 'photo';
    return new File([blob], `${stem}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // Undecodable (e.g., some HEIC files): keep the original and let the backend validate it.
    return file;
  }
}
