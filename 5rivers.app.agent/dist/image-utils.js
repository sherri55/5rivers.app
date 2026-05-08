/**
 * image-utils.ts — pre-process images before sending to the LLM.
 *
 * Why this exists:
 *   Gemini tokenizes images as ~258 tokens per 768×768 tile. A raw phone
 *   photo of a ticket is typically 3000–4000 px on the long edge, which
 *   tiles into 20+ chunks (≈ 5 000–6 000 tokens) — for one image, on every
 *   parser call. Resizing to ≤ 1568 px on the long edge collapses the
 *   image to a single tile (~258 tokens) with no observable loss of
 *   handwritten-ticket OCR quality.
 *
 * What we do:
 *   • Decode the input via `sharp` (handles PNG, JPEG, HEIC, WEBP, …)
 *   • Auto-orient using EXIF so rotated phone photos are upright
 *   • Resize so neither edge exceeds LLM_IMAGE_MAX_EDGE (default 1568)
 *   • Re-encode as JPEG quality LLM_IMAGE_QUALITY (default 85)
 *   • Skip the work cleanly when the input is already small enough — we
 *     return the original buffer to avoid a needless decode/encode round
 *
 * The resized buffer is also what gets attached to the created job, so
 * job-image storage is smaller too.
 */
import sharp from 'sharp';
/** Tunables, overridable via env. */
const MAX_EDGE = parseInt(process.env.LLM_IMAGE_MAX_EDGE ?? '1568', 10);
const QUALITY = parseInt(process.env.LLM_IMAGE_QUALITY ?? '85', 10);
/**
 * Resize a single image for LLM consumption.
 * Returns a `RawImage` with normalized JPEG bytes when work was done, or
 * the input unchanged when the image was already small + already JPEG.
 */
export async function resizeForLLM(img) {
    const inputBuffer = Buffer.from(img.data, 'base64');
    const inputBytes = inputBuffer.length;
    try {
        // Probe metadata first so we can skip work on already-small JPEGs.
        const meta = await sharp(inputBuffer).metadata();
        const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
        const isJpeg = (meta.format === 'jpeg') || img.mimeType === 'image/jpeg';
        if (longEdge > 0 && longEdge <= MAX_EDGE && isJpeg) {
            console.log(`[img] keep as-is: ${meta.width}×${meta.height} ${meta.format} (${(inputBytes / 1024).toFixed(0)} KiB)`);
            return img;
        }
        const out = await sharp(inputBuffer)
            .rotate() // honour EXIF orientation
            .resize({
            width: MAX_EDGE,
            height: MAX_EDGE,
            fit: 'inside',
            withoutEnlargement: true,
        })
            .jpeg({ quality: QUALITY, mozjpeg: true })
            .toBuffer({ resolveWithObject: true });
        const ratio = inputBytes > 0 ? (out.info.size / inputBytes) : 1;
        console.log(`[img] resized: ${meta.width}×${meta.height} ${meta.format} ` +
            `→ ${out.info.width}×${out.info.height} jpeg ` +
            `(${(inputBytes / 1024).toFixed(0)} KiB → ${(out.info.size / 1024).toFixed(0)} KiB, ${(ratio * 100).toFixed(0)}%)`);
        return {
            data: out.data.toString('base64'),
            mimeType: 'image/jpeg',
        };
    }
    catch (err) {
        // Don't fail the whole pipeline because of a resize hiccup — keep
        // original bytes and let the LLM try anyway.
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[img] resize failed (${msg}) — sending original bytes`);
        return img;
    }
}
/** Resize an array of images, preserving order. */
export async function resizeAllForLLM(images) {
    if (!images || images.length === 0)
        return images;
    return Promise.all(images.map(resizeForLLM));
}
