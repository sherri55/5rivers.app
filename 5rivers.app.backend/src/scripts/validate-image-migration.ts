/**
 * Validate that the image migration (disk -> Neo4j) completed correctly.
 *
 * Run: npm run validate-image-migration
 * (or: npx ts-node src/scripts/validate-image-migration.ts)
 */

import { neo4jService } from '../database/neo4j';
import { getImageById } from '../services/imageStorageService';

const API_IMAGES_PATTERN = /\/api\/images\/([a-f0-9-]{36})/i;

/** Format ISO date to YYYY-MM-DD for display */
function formatJobDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(0, 10);
  } catch {
    return String(iso);
  }
}

async function main() {
  console.log('🔍 Validating image migration...\n');

  // 1. Count StoredImage nodes
  const storedCount = await neo4jService.runQuery<{ count: number }>(
    'MATCH (s:StoredImage) RETURN count(s) as count'
  );
  const totalStored = storedCount[0]?.count ?? 0;
  console.log(`  StoredImage nodes in Neo4j: ${totalStored}`);

  // 2. Count HAS_IMAGE relationships
  const relCount = await neo4jService.runQuery<{ count: number }>(
    'MATCH (j:Job)-[:HAS_IMAGE]->(s:StoredImage) RETURN count(*) as count'
  );
  const totalRels = relCount[0]?.count ?? 0;
  console.log(`  (Job)-[:HAS_IMAGE]->(StoredImage) relationships: ${totalRels}`);

  // 3. Jobs with at least one image reference (include job details for display)
  const jobsWithImages = await neo4jService.runQuery(
    `MATCH (j:Job)
     WHERE j.images IS NOT NULL AND size(j.images) > 0
        OR j.imageUrls IS NOT NULL AND j.imageUrls <> ''
     OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)<-[:HAS_JOB_TYPE]-(c:Company)
     OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(d:Driver)
     OPTIONAL MATCH (j)-[:MANAGED_BY]->(disp:Dispatcher)
     OPTIONAL MATCH (j)-[:USES_UNIT]->(u:Unit)
     OPTIONAL MATCH (j)-[:INVOICED_IN]->(inv:Invoice)
     RETURN j.id as jobId, j.jobDate as jobDate, j.images as images, j.imageUrls as imageUrls,
            j.ticketIds as ticketIds, j.loads as loads, j.weight as weight,
            j.startTime as startTime, j.endTime as endTime, j.amount as amount, j.invoiceStatus as invoiceStatus,
            jt.title as jobTypeTitle, c.name as companyName, d.name as driverName,
            disp.name as dispatcherName, u.name as unitName, inv.invoiceNumber as invoiceNumber`
  ).then((rows: any[]) =>
    rows.map((r) => {
      const urls: string[] = Array.isArray(r.images) ? r.images : [];
      if (r.imageUrls && typeof r.imageUrls === 'string') {
        if (r.imageUrls.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(r.imageUrls);
            if (Array.isArray(arr)) urls.push(...arr.filter((u: unknown) => typeof u === 'string'));
          } catch {
            urls.push(r.imageUrls);
          }
        } else urls.push(r.imageUrls);
      }
      const weightStr = r.weight != null
        ? (Array.isArray(r.weight) ? r.weight.join(', ') : String(r.weight))
        : null;
      return {
        jobId: r.jobId,
        urls: [...new Set(urls)].filter(Boolean),
        jobDate: formatJobDate(r.jobDate),
        jobTypeTitle: r.jobTypeTitle ?? '—',
        companyName: r.companyName ?? '—',
        driverName: r.driverName ?? '—',
        dispatcherName: r.dispatcherName ?? '—',
        unitName: r.unitName ?? '—',
        invoiceNumber: r.invoiceNumber ?? '—',
        ticketIds: Array.isArray(r.ticketIds) ? r.ticketIds.join(', ') : (r.ticketIds ?? '—'),
        loads: r.loads != null ? r.loads : '—',
        weight: weightStr ?? '—',
        startTime: r.startTime ?? '—',
        endTime: r.endTime ?? '—',
        amount: r.amount != null ? r.amount : '—',
        invoiceStatus: r.invoiceStatus ?? '—',
      };
    })
  );

  console.log(`  Jobs with image references: ${jobsWithImages.length}`);

  // 4. Classify: fully migrated (all URLs are /api/images/:id) vs still legacy
  type JobInfo = {
    jobId: string;
    legacyUrls: string[];
    jobDate: string;
    jobTypeTitle: string;
    companyName: string;
    driverName: string;
    dispatcherName: string;
    unitName: string;
    invoiceNumber: string;
    ticketIds: string;
    loads: unknown;
    weight: string;
    startTime: string;
    endTime: string;
    amount: unknown;
    invoiceStatus: string;
  };
  let fullyMigrated = 0;
  const legacyJobs: JobInfo[] = [];
  const allImageIds = new Set<string>();

  for (const row of jobsWithImages) {
    const { jobId, urls, ...rest } = row;
    const legacyUrls = urls.filter((u) => !API_IMAGES_PATTERN.test(u));
    if (legacyUrls.length === 0) {
      fullyMigrated++;
      urls.forEach((u) => {
        const m = u.match(API_IMAGES_PATTERN);
        if (m) allImageIds.add(m[1]);
      });
    } else {
      legacyJobs.push({ jobId, legacyUrls, ...rest });
    }
  }

  console.log(`  Jobs fully migrated (all URLs → /api/images/:id): ${fullyMigrated}`);
  if (legacyJobs.length > 0) {
    console.log(`  ⚠ Jobs still with legacy URLs: ${legacyJobs.length}`);
    console.log('\n--- Jobs with legacy images (upload image in app for this job) ---');
    console.log('  Find the job by the details below, then add the image there.');
    console.log('  Or put the file under backend/uploads/ at the expected path and run: npm run migrate-images\n');
    for (const job of legacyJobs) {
      console.log(`  Date:       ${job.jobDate}`);
      console.log(`  Company:    ${job.companyName}`);
      console.log(`  Job type:   ${job.jobTypeTitle}`);
      console.log(`  Driver:     ${job.driverName}`);
      console.log(`  Dispatcher: ${job.dispatcherName}`);
      console.log(`  Unit:       ${job.unitName}`);
      console.log(`  Ticket(s):  ${job.ticketIds}`);
      console.log(`  Loads:      ${job.loads}  |  Weight: ${job.weight}  |  Amount: ${job.amount}`);
      console.log(`  Time:       ${job.startTime} – ${job.endTime}`);
      console.log(`  Invoice:    ${job.invoiceNumber}  (${job.invoiceStatus})`);
      console.log(`  Job ID:     ${job.jobId}`);
      for (const u of job.legacyUrls) {
        const afterUploads = u.replace(/^.*\/uploads\//i, 'uploads/').replace(/^uploads\//i, '');
        const pathHint = afterUploads.includes('/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(afterUploads)
          ? `  → or place file at: uploads/${afterUploads.split('?')[0]}`
          : `  → or place file at: uploads/jobs/${afterUploads.split('?')[0]}`;
        console.log(`    ${u}`);
        console.log(`    ${pathHint}`);
      }
      console.log('');
    }
    console.log('--- End of legacy jobs list ---\n');
  }

  // 5. Orphan check: StoredImages not linked by any job
  const orphaned = await neo4jService.runQuery<{ count: number }>(
    `MATCH (s:StoredImage)
     WHERE NOT (s)<-[:HAS_IMAGE]-(:Job)
     RETURN count(s) as count`
  );
  const orphanCount = orphaned[0]?.count ?? 0;
  if (orphanCount > 0) {
    console.log(`  ℹ StoredImages not linked to any job (e.g. upload-only): ${orphanCount}`);
  }

  // 6. Sample a few StoredImages and verify data is loadable
  const sampleIds = await neo4jService.runQuery<{ id: string }>(
    'MATCH (s:StoredImage) RETURN s.id as id LIMIT 3'
  );
  let loadOk = 0;
  for (const row of sampleIds) {
    const img = await getImageById(row.id);
    if (img?.dataBase64 && img.dataBase64.length > 0) loadOk++;
  }
  console.log(`  Sample load check (${sampleIds.length} images): ${loadOk}/${sampleIds.length} loadable from DB`);

  // Summary
  console.log('\n--- Summary ---');
  if (totalStored === 0 && jobsWithImages.length === 0) {
    console.log('  No images in DB and no jobs with image refs. Nothing to validate.');
  } else if (legacyJobs.length === 0 && loadOk === sampleIds.length) {
    console.log('  ✅ Migration looks good: all job image refs use /api/images/:id, sample images load.');
  } else if (legacyJobs.length > 0) {
    console.log('  ⚠ See "Jobs with legacy images" above. Add those files under backend/uploads/, then run: npm run migrate-images');
  } else {
    console.log('  ✅ Job refs migrated. Re-check sample load if any failed.');
  }
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
