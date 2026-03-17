/**
 * Migrate existing on-disk images (uploads/) into Neo4j as StoredImage nodes
 * and update all job references to the new /api/images/:id URLs.
 * Also creates (Job)-[:HAS_IMAGE]->(StoredImage) relationships.
 *
 * Run: npx ts-node src/scripts/migrate-images-to-neo4j.ts
 * (or: npm run build && node dist/scripts/migrate-images-to-neo4j.js)
 *
 * Safe to run multiple times: already-migrated URLs (api/images/:id) are skipped.
 */

import path from 'path';
import fs from 'fs';
import { neo4jService } from '../database/neo4j';
import { storeImage, linkJobToStoredImages, parseImageIdFromUrl } from '../services/imageStorageService';
import { config } from '../config';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const BASE_URL = config.upload.baseUrl.replace(/\/$/, '');

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

/** Normalize legacy URL to a relative path under uploads/ (e.g. "jobs/foo.jpg") */
function urlToRelativePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Already migrated
  if (trimmed.includes('/api/images/')) return null;
  // Extract path after /uploads/
  let match = trimmed.match(/\/uploads\/(.+)$/i) || trimmed.match(/^uploads\/(.+)$/i);
  if (match) return match[1].replace(/^\.\//, '').split('?')[0];
  // "jobs/foo.jpg" or "jobs/123_abc.jpg" (no uploads/ prefix)
  match = trimmed.match(/^jobs\/(.+)$/i);
  if (match) return match[1].split('?')[0];
  // Plain filename (e.g. "1734567890_abc_photo.jpg") -> assume jobs/
  if (IMAGE_EXT.test(trimmed) && !trimmed.includes('://') && !trimmed.startsWith('/')) {
    const segment = trimmed.split('?')[0];
    if (!segment.includes('\\')) return `jobs/${segment}`;
  }
  return null;
}

/** Resolve relative path to absolute file path */
function toAbsolutePath(relativePath: string): string {
  return path.join(UPLOADS_DIR, relativePath);
}

/** Collect all image URLs from a job (imageUrls string + images array) */
function collectJobImageUrls(job: {
  imageUrls?: string | null;
  images?: string[] | null;
}): string[] {
  const urls: string[] = [];
  if (job.images && Array.isArray(job.images)) {
    urls.push(...job.images.filter((u): u is string => typeof u === 'string' && u.trim().length > 0));
  }
  if (job.imageUrls && typeof job.imageUrls === 'string' && job.imageUrls.trim()) {
    const s = job.imageUrls.trim();
    if (s.startsWith('[')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) urls.push(...arr.filter((u: unknown) => typeof u === 'string'));
      } catch {
        urls.push(...s.split(/[,\s]+/).filter((u) => u.trim()));
      }
    } else {
      urls.push(...s.split(/[,\s]+/).filter((u) => u.trim()));
    }
  }
  return [...new Set(urls)];
}

/** Replace a single URL: if it's legacy, return newUrl from map; else return as-is */
function replaceUrl(url: string, oldToNew: Map<string, string>): string {
  const normalized = url.trim();
  const newUrl = oldToNew.get(normalized);
  if (newUrl) return newUrl;
  return normalized;
}

async function main() {
  console.log('📷 Migrating job images from disk to Neo4j...\n');

  const jobsResult = await neo4jService.runQuery<{
    id: string;
    imageUrls: string | null;
    images: string[] | null;
  }>(
    `MATCH (j:Job)
     WHERE j.imageUrls IS NOT NULL OR j.images IS NOT NULL
     RETURN j.id as id, j.imageUrls as imageUrls, j.images as images`
  );

  if (!jobsResult.length) {
    console.log('No jobs with image references found.');
    return;
  }

  console.log(`Found ${jobsResult.length} job(s) with image references.\n`);

  const allLegacyUrls = new Set<string>();
  for (const row of jobsResult) {
    const urls = collectJobImageUrls({
      imageUrls: row.imageUrls,
      images: row.images,
    });
    for (const u of urls) {
      if (u && !u.includes('/api/images/')) allLegacyUrls.add(u);
    }
  }

  const legacyUrls = [...allLegacyUrls];
  console.log(`Unique legacy image URLs to migrate: ${legacyUrls.length}\n`);

  const oldUrlToNewUrl = new Map<string, string>();
  const pathToNewUrl = new Map<string, string>(); // dedupe: one storage per file path

  for (const url of legacyUrls) {
    const relPath = urlToRelativePath(url);
    if (!relPath) continue;

    const absPath = toAbsolutePath(relPath);
    if (!fs.existsSync(absPath)) {
      console.warn(`  ⚠ File not found, skipping: ${url} -> ${absPath}`);
      continue;
    }

    const normalizedPath = path.normalize(absPath);

    if (pathToNewUrl.has(normalizedPath)) {
      oldUrlToNewUrl.set(url, pathToNewUrl.get(normalizedPath)!);
      continue;
    }

    try {
      const buffer = fs.readFileSync(absPath);
      const originalName = path.basename(relPath);
      const result = await storeImage(buffer, originalName);
      pathToNewUrl.set(normalizedPath, result.url);
      oldUrlToNewUrl.set(url, result.url);
      console.log(`  ✅ ${relPath} -> ${result.url}`);
    } catch (err) {
      console.warn(`  ❌ Failed to migrate ${url}:`, err instanceof Error ? err.message : err);
    }
  }

  if (oldUrlToNewUrl.size === 0) {
    console.log('\nNo files were migrated. Jobs unchanged.');
    return;
  }

  console.log(`\nUpdating ${jobsResult.length} job(s) with new image URLs and HAS_IMAGE links...\n`);

  for (const row of jobsResult) {
    const urls = collectJobImageUrls({
      imageUrls: row.imageUrls,
      images: row.images,
    });
    const newUrls = urls.map((u) => replaceUrl(u, oldUrlToNewUrl));
    const newImages = newUrls.filter((u) => u.length > 0);
    const imageIds = newImages.map((u) => parseImageIdFromUrl(u)).filter((id): id is string => id != null);

    const newImageUrlsStr =
      newImages.length === 0
        ? null
        : newImages.length === 1
          ? newImages[0]
          : JSON.stringify(newImages);

    await neo4jService.runQuery(
      `MATCH (j:Job { id: $jobId })
       SET j.images = $images, j.imageUrls = $imageUrls`,
      {
        jobId: row.id,
        images: newImages,
        imageUrls: newImageUrlsStr,
      }
    );

    if (imageIds.length > 0) {
      await linkJobToStoredImages(row.id, imageIds);
    }

    console.log(`  Job ${row.id}: ${newImages.length} image(s), ${imageIds.length} HAS_IMAGE link(s).`);
  }

  console.log('\n✅ Migration complete. Job image references now point to Neo4j (StoredImage).');
  console.log('   You can optionally remove or archive the uploads/ folder after verifying.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
