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
export interface RawImage {
    /** base64 (no data: URI prefix) */
    data: string;
    /** original mime type (e.g. "image/jpeg") */
    mimeType: string;
}
/**
 * Resize a single image for LLM consumption.
 * Returns a `RawImage` with normalized JPEG bytes when work was done, or
 * the input unchanged when the image was already small + already JPEG.
 */
export declare function resizeForLLM(img: RawImage): Promise<RawImage>;
/** Resize an array of images, preserving order. */
export declare function resizeAllForLLM(images: RawImage[]): Promise<RawImage[]>;
