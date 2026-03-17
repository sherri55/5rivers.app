/**
 * List jobs that still have legacy image URLs (not /api/images/:id).
 * Run: npx ts-node src/scripts/list-legacy-image-urls.ts
 */

import { neo4jService } from '../database/neo4j';

const API_IMAGES_PATTERN = /\/api\/images\/([a-f0-9-]{36})/i;

function collectUrls(job: any): string[] {
  const urls: string[] = [];
  if (job.images && Array.isArray(job.images)) {
    urls.push(...job.images.filter((u: unknown) => typeof u === 'string' && (u as string).trim()));
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

async function main() {
  const rows = await neo4jService.runQuery<{ id: string; images: string[]; imageUrls: string }>(
    `MATCH (j:Job)
     WHERE j.imageUrls IS NOT NULL OR j.images IS NOT NULL
     RETURN j.id as id, j.images as images, j.imageUrls as imageUrls`
  );

  const legacy: { jobId: string; urls: string[] }[] = [];
  for (const r of rows) {
    const urls = collectUrls(r);
    const legacyUrls = urls.filter((u) => !API_IMAGES_PATTERN.test(u));
    if (legacyUrls.length > 0) legacy.push({ jobId: r.id, urls: legacyUrls });
  }

  console.log(`Jobs with legacy image URLs: ${legacy.length}\n`);
  for (const { jobId, urls } of legacy) {
    console.log(`  ${jobId}:`);
    urls.forEach((u) => console.log(`    - ${u}`));
    console.log('');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
