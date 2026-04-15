/**
 * fix-jobtype-company.ts
 *
 * Finds JobTypes whose companyId points to a company that no longer belongs
 * to the active organization (broken after migration), then re-links them by
 * matching the old company name to the new company record.
 *
 * Run:  npx ts-node --esm scripts/fix-jobtype-company.ts
 *   or: npx ts-node scripts/fix-jobtype-company.ts
 *
 * Pass --dry-run to preview without writing.
 */

import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

function buildConnectionString(raw: string): string {
  let url = raw.trim()
    .replace(/^Data Source=/i, 'Server=')
    .replace(/User ID=/gi, 'User Id=');
  url = url
    .replace(/Application Name="[^"]*";?/gi, '')
    .replace(/Command Timeout=\d+;?/gi, '')
    .replace(/Persist Security Info=True;?/gi, '')
    .replace(/Pooling=False;?/gi, '')
    .replace(/MultipleActiveResultSets=False;?/gi, '')
    .replace(/;+/g, ';').replace(/^;|;$/, '');
  if (!/Connection Timeout=/i.test(url)) url += ';Connection Timeout=60';
  if (!/Database=/i.test(url)) url += ';Database=5rivers';
  return url;
}

async function main() {
  const connStr = buildConnectionString(process.env.DATABASE_URL ?? '');
  const pool = await sql.connect(connStr);

  // ── 1. Get the target org ID by slug ────────────────────────────────────────
  const orgSlug = process.env.FIVE_RIVERS_ORG_SLUG ?? 'demo';
  const orgRows = await pool.request()
    .input('slug', orgSlug)
    .query<{ id: string }>(`SELECT id FROM Organizations WHERE slug = @slug`);

  if (!orgRows.recordset.length) {
    console.error(`Organization with slug '${orgSlug}' not found.`);
    process.exit(1);
  }
  const orgId = orgRows.recordset[0].id;
  console.log(`\nOrganization: ${orgSlug} (${orgId})\n`);

  // ── 2. Find job types with broken company associations ───────────────────────
  const brokenRows = await pool.request()
    .input('orgId', orgId)
    .query<{ id: string; title: string; companyId: string }>(`
      SELECT jt.id, jt.title, jt.companyId
      FROM JobTypes jt
      WHERE NOT EXISTS (
        SELECT 1 FROM Companies c
        WHERE c.id = jt.companyId AND c.organizationId = @orgId
      )
    `);

  const broken = brokenRows.recordset;
  if (!broken.length) {
    console.log('✅ No broken job type → company associations found.');
    await pool.close();
    return;
  }

  console.log(`Found ${broken.length} broken job type(s):\n`);

  // ── 3. For each broken job type, look up the old company name ───────────────
  //    (the old company record may still exist in the DB under a different org)
  let fixed = 0;
  let skipped = 0;

  for (const jt of broken) {
    // Look up old company name anywhere in the DB
    const oldCompanyRows = await pool.request()
      .input('id', jt.companyId)
      .query<{ name: string; organizationId: string }>(`
        SELECT name, organizationId FROM Companies WHERE id = @id
      `);

    const oldCompany = oldCompanyRows.recordset[0];
    const oldName = oldCompany?.name ?? '(unknown — record deleted)';

    // Find a matching company in the current org by name (case-insensitive)
    const newCompanyRows = await pool.request()
      .input('orgId', orgId)
      .input('name', oldName)
      .query<{ id: string; name: string }>(`
        SELECT id, name FROM Companies
        WHERE organizationId = @orgId AND LOWER(name) = LOWER(@name)
      `);

    const newCompany = newCompanyRows.recordset[0];

    if (!newCompany) {
      // Try fuzzy: LIKE match on the first significant word
      const firstWord = oldName.split(/\s+/)[0];
      const fuzzyRows = await pool.request()
        .input('orgId', orgId)
        .input('like', `%${firstWord}%`)
        .query<{ id: string; name: string }>(`
          SELECT id, name FROM Companies
          WHERE organizationId = @orgId AND name LIKE @like
        `);

      console.log(`  ⚠️  "${jt.title}" (jobTypeId: ${jt.id})`);
      console.log(`      Old company: "${oldName}" (id: ${jt.companyId})`);
      if (fuzzyRows.recordset.length) {
        console.log(`      No exact match. Fuzzy candidates for "${firstWord}":`);
        for (const c of fuzzyRows.recordset) {
          console.log(`        - ${c.name} (${c.id})`);
        }
      } else {
        console.log(`      No match found for "${oldName}" in the current org.`);
      }
      console.log(`      ➜  Skipped — update companyId manually.\n`);
      skipped++;
      continue;
    }

    console.log(`  🔗 "${jt.title}"`);
    console.log(`      Old companyId: ${jt.companyId} ("${oldName}")`);
    console.log(`      New companyId: ${newCompany.id} ("${newCompany.name}")`);

    if (DRY_RUN) {
      console.log(`      ➜  [DRY RUN] Would update.\n`);
    } else {
      await pool.request()
        .input('newId', newCompany.id)
        .input('oldId', jt.companyId)
        .query(`UPDATE JobTypes SET companyId = @newId WHERE companyId = @oldId`);
      console.log(`      ✅ Updated.\n`);
      fixed++;
    }
  }

  console.log(`\nSummary: ${fixed} fixed, ${skipped} skipped (need manual review).`);
  if (DRY_RUN) console.log('(Dry run — no changes written. Re-run without --dry-run to apply.)');

  await pool.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
