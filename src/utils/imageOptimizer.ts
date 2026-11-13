import { MAX_IMAGE_STRING_LENGTH } from './productCatalog';

export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 960
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" is not a supported image file.`);
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
    reader.readAsDataURL(file);
  });

  // Load into an HTMLImageElement so we can resize & compress cleanly for cloud storage
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Unable to decode image "${file.name}".`));
    el.src = rawDataUrl;
  });

  const srcWidth = img.naturalWidth || img.width || maxDimension;
  const srcHeight = img.naturalHeight || img.height || maxDimension;
  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (rawDataUrl.length <= MAX_IMAGE_STRING_LENGTH) {
      return rawDataUrl;
    }
    throw new Error('Browser canvas unavailable to compress image.');
  }

  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const qualitySteps = [0.84, 0.74, 0.64, 0.52];
  for (const q of qualitySteps) {
    const compressed = canvas.toDataURL('image/jpeg', q);
    if (compressed.length <= 210_000) {
      return compressed;
    }
  }

  // Final downscale pass if the image is extremely detailed
  const halfCanvas = document.createElement('canvas');
  halfCanvas.width = Math.max(1, Math.round(targetWidth * 0.7));
  halfCanvas.height = Math.max(1, Math.round(targetHeight * 0.7));
  const halfCtx = halfCanvas.getContext('2d');
  if (halfCtx) {
    halfCtx.fillStyle = '#0A0A0C';
    halfCtx.fillRect(0, 0, halfCanvas.width, halfCanvas.height);
    halfCtx.drawImage(img, 0, 0, halfCanvas.width, halfCanvas.height);
    const smaller = halfCanvas.toDataURL('image/jpeg', 0.68);
    if (smaller.length <= MAX_IMAGE_STRING_LENGTH) {
      return smaller;
    }
  }

  throw new Error(`"${file.name}" remains too large after compression. Please select a smaller image.`);
}
