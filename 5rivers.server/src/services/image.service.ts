import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { getJobById } from './job.service';

export interface ImageMeta {
  id: string;
  jobId: string;
  contentType: string;
  fileName: string | null;
  createdAt: Date;
}

export interface ImageWithContent extends ImageMeta {
  content: Buffer;
}

export async function listImagesByJob(
  jobId: string,
  organizationId: string
): Promise<ImageMeta[]> {
  const job = await getJobById(jobId, organizationId);
  if (!job) return [];

  const rows = await query<ImageMeta[]>(
    `SELECT id, jobId, contentType, fileName, createdAt
     FROM Images
     WHERE jobId = @jobId
     ORDER BY createdAt`,
    { params: { jobId } }
  );
  return Array.isArray(rows) ? rows : [];
}

export async function getImageById(
  imageId: string,
  jobId: string,
  organizationId: string
): Promise<ImageWithContent | null> {
  const job = await getJobById(jobId, organizationId);
  if (!job) return null;

  const rows = await query<ImageWithContent[]>(
    `SELECT id, jobId, content, contentType, fileName, createdAt
     FROM Images
     WHERE id = @imageId AND jobId = @jobId`,
    { params: { imageId, jobId } }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function createImage(
  organizationId: string,
  jobId: string,
  content: Buffer,
  contentType: string,
  fileName?: string | null
): Promise<ImageMeta> {
  const job = await getJobById(jobId, organizationId);
  if (!job) throw new Error('Job not found');

  const id = uuid();
  const now = new Date();
  await query(
    `INSERT INTO Images (id, jobId, content, contentType, fileName, createdAt)
     VALUES (@id, @jobId, @content, @contentType, @fileName, @createdAt)`,
    {
      params: {
        id,
        jobId,
        content,
        contentType: contentType || 'application/octet-stream',
        fileName: fileName ?? null,
        createdAt: now,
      },
    }
  );
  const list = await listImagesByJob(jobId, organizationId);
  const meta = list.find((m) => m.id === id);
  if (!meta) throw new Error('Failed to create image');
  return meta;
}

export async function deleteImage(
  imageId: string,
  jobId: string,
  organizationId: string
): Promise<boolean> {
  const job = await getJobById(jobId, organizationId);
  if (!job) return false;

  const rows = await query<Array<{ id: string }>>(
    `SELECT id FROM Images WHERE id = @imageId AND jobId = @jobId`,
    { params: { imageId, jobId } }
  );
  if (!Array.isArray(rows) || rows.length === 0) return false;

  await query(`DELETE FROM Images WHERE id = @imageId AND jobId = @jobId`, {
    params: { imageId, jobId },
  });
  return true;
}
