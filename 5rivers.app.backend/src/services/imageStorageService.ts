import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { neo4jService } from '../database/neo4j';
import { config } from '../config';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 85;

export interface StoredImageResult {
  id: string;
  mimeType: string;
  url: string;
}

/**
 * Compress image and return as JPEG buffer + base64 for storage.
 */
async function compressImage(buffer: Buffer): Promise<{ buffer: Buffer; base64: string }> {
  const pipeline = sharp(buffer)
    .rotate() // Auto-rotate from EXIF
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true });

  const outBuffer = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  const base64 = outBuffer.toString('base64');
  return { buffer: outBuffer, base64 };
}

/**
 * Store image in Neo4j as :StoredImage (compressed JPEG, base64 in property).
 * Returns id and URL to serve the image.
 */
export async function storeImage(buffer: Buffer, originalName: string): Promise<StoredImageResult> {
  const { base64 } = await compressImage(buffer);
  const id = uuidv4();
  const mimeType = 'image/jpeg';
  const baseUrl = config.upload.baseUrl.replace(/\/$/, '');

  const query = `
    CREATE (s:StoredImage {
      id: $id,
      mimeType: $mimeType,
      data: $data,
      originalName: $originalName,
      createdAt: datetime()
    })
    RETURN s.id as id
  `;

  await neo4jService.runQuery(query, {
    id,
    mimeType,
    data: base64,
    originalName: originalName || 'image.jpg',
  });

  return {
    id,
    mimeType,
    url: `${baseUrl}/api/images/${id}`,
  };
}

export interface StoredImageData {
  id: string;
  mimeType: string;
  dataBase64: string;
  buffer?: Buffer;
}

/**
 * Load stored image by id. Returns base64 data and optional buffer.
 */
export async function getImageById(imageId: string): Promise<StoredImageData | null> {
  const query = `
    MATCH (s:StoredImage { id: $id })
    RETURN s.id as id, s.mimeType as mimeType, s.data as data
  `;
  const result = await neo4jService.runQuery<{ id: string; mimeType: string; data: string }>(
    query,
    { id: imageId }
  );

  if (!result.length || !result[0].data) {
    return null;
  }

  const row = result[0];
  const dataBase64 = typeof row.data === 'string' ? row.data : String(row.data);
  const buffer = Buffer.from(dataBase64, 'base64');

  return {
    id: row.id,
    mimeType: row.mimeType || 'image/jpeg',
    dataBase64,
    buffer,
  };
}

/**
 * Link a job to stored images by parsing image IDs from URLs (e.g. .../api/images/:id).
 * Call this from createJob/updateJob when images array contains our URLs.
 */
export function parseImageIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Match /api/images/<uuid> or full base URL ending with /api/images/<uuid>
  const match = trimmed.match(/\/api\/images\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}

/**
 * Create (Job)-[:HAS_IMAGE]->(StoredImage) for each image id.
 * Idempotent: uses MERGE so existing relationships are not duplicated.
 */
export async function linkJobToStoredImages(
  jobId: string,
  imageIds: string[]
): Promise<void> {
  if (!imageIds.length) return;
  const uniqueIds = [...new Set(imageIds)];
  for (const imageId of uniqueIds) {
    await neo4jService.runQuery(
      `MATCH (j:Job { id: $jobId }), (s:StoredImage { id: $imageId })
       MERGE (j)-[:HAS_IMAGE]->(s)`,
      { jobId, imageId }
    );
  }
}
