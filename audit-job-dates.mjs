/**
 * Job Date/Time Audit & Fix Script
 *
 * Audits all jobs and converts dates/times to proper UTC.
 *
 * Current state:
 *   jobDate:   "2025-12-05T00:00:00.000Z"  — midnight UTC (wrong: shows Dec 4 in EST)
 *   startTime: "2025-12-05T07:00"           — Eastern time without Z (ambiguous)
 *   startTime: "07:15"                      — bare Eastern time
 *   startTime: null                         — no time
 *
 * Target state:
 *   jobDate:   "2025-12-05T05:00:00.000Z"  — midnight EST in UTC (Dec 5 in Eastern ✅)
 *   startTime: "2025-12-05T12:00:00.000Z"  — 7 AM EST in UTC
 *   endTime:   "2025-12-05T22:00:00.000Z"  — 5 PM EST in UTC
 *
 * Usage:
 *   node audit-job-dates.mjs              — dry run (shows report only)
 *   node audit-job-dates.mjs --apply      — applies fixes via PATCH
 */

const API_URL = 'http://localhost:4000/api';
const EMAIL = 'info@5riverstruckinginc.ca';
const PASSWORD = 'Demo123!';
const ORG_SLUG = 'demo';
const DRY_RUN = !process.argv.includes('--apply');

// ── Auth ────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, organizationSlug: ORG_SLUG }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Login failed: ${res.status}`);
  return json.token;
}

// ── Fetch all jobs ──────────────────────────────────────────
async function fetchAllJobs(token) {
  const jobs = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${API_URL}/jobs?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    jobs.push(...json.data);
    if (page >= json.totalPages) break;
    page++;
  }
  return jobs;
}

// ── Timezone helpers ────────────────────────────────────────

/**
 * Get the UTC offset (in hours) for Eastern time on a given date.
 * EST = UTC-5 (Nov first Sun → Mar second Sun)
 * EDT = UTC-4 (Mar second Sun → Nov first Sun)
 */
function getEasternOffsetHours(dateStr) {
  // Create a date at noon UTC on that day (avoids edge cases)
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00Z');
  // Use Intl to find the actual offset
  const utcStr = d.toLocaleString('en-US', { timeZone: 'UTC' });
  const estStr = d.toLocaleString('en-US', { timeZone: 'America/Toronto' });
  const utcDate = new Date(utcStr);
  const estDate = new Date(estStr);
  const diffMs = utcDate.getTime() - estDate.getTime();
  return diffMs / 3600000; // positive = EST is behind UTC
}

/**
 * Convert a date string (YYYY-MM-DD) + time (HH:MM) in Eastern to a UTC ISO string.
 */
function easternToUTC(dateStr, hours, minutes) {
  const offsetH = getEasternOffsetHours(dateStr);
  // Eastern time = UTC - offset, so UTC = Eastern + offset
  const utcHours = hours + offsetH;
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(utcHours, minutes, 0, 0);
  return d.toISOString();
}

/**
 * Parse a time value into { hours, minutes } in Eastern time.
 * Handles:
 *   "2025-12-05T07:00"      → { h: 7, m: 0 }   (ISO without Z = treated as Eastern)
 *   "2025-12-05T12:00:00.000Z" → convert from UTC to Eastern
 *   "07:15"                  → { h: 7, m: 15 }
 */
function parseTimeAsEastern(val, jobDateStr) {
  if (!val) return null;

  // Bare time: "07:15" or "7:15"
  const bareMatch = val.match(/^(\d{1,2}):(\d{2})$/);
  if (bareMatch) {
    return { h: parseInt(bareMatch[1], 10), m: parseInt(bareMatch[2], 10) };
  }

  // ISO with Z: "2025-12-05T12:00:00.000Z" — this is actual UTC, convert to Eastern
  if (val.endsWith('Z') || val.includes('+')) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const estStr = d.toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      hour: 'numeric', minute: '2-digit', hour12: false,
    });
    const parts = estStr.match(/(\d{1,2}):(\d{2})/);
    if (parts) return { h: parseInt(parts[1], 10), m: parseInt(parts[2], 10) };
    return null;
  }

  // ISO without Z: "2025-12-05T07:00" — this IS Eastern time
  const isoMatch = val.match(/T(\d{1,2}):(\d{2})/);
  if (isoMatch) {
    return { h: parseInt(isoMatch[1], 10), m: parseInt(isoMatch[2], 10) };
  }

  return null;
}

function fmtHM(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made\n' : '🔧 APPLY MODE — will PATCH jobs\n');

  console.log('Logging in...');
  const token = await login();

  console.log('Fetching all jobs...');
  const jobs = await fetchAllJobs(token);
  console.log(`Total jobs: ${jobs.length}\n`);

  const autoFixable = [];
  const needsReview = [];
  const alreadyCorrect = [];

  for (const job of jobs) {
    const id = job.id;
    const jobDate = job.jobDate;        // "2025-12-05T00:00:00.000Z"
    const startTime = job.startTime;    // "2025-12-05T07:00" or "07:15" or null
    const endTime = job.endTime;        // same patterns
    const meta = {
      company: job.companyName || '—',
      driver: job.driverName || '—',
      jobType: job.jobTypeTitle || job.jobTypeName || '—',
    };

    // The intended date is the UTC date portion of jobDate
    // (since it was stored as midnight UTC, the UTC date IS the intended Eastern date)
    const intendedDate = jobDate.slice(0, 10); // "2025-12-05"
    const offsetH = getEasternOffsetHours(intendedDate);
    const issues = [];

    // ── Fix jobDate ──
    // Current: 2025-12-05T00:00:00.000Z (midnight UTC)
    // Correct: midnight Eastern in UTC = T05:00Z (EST) or T04:00Z (EDT)
    const correctJobDate = easternToUTC(intendedDate, 0, 0);
    const jobDateNeedsFix = jobDate !== correctJobDate;

    // ── Fix startTime ──
    let correctStartTime = null;
    const startEastern = parseTimeAsEastern(startTime, intendedDate);
    if (startEastern) {
      correctStartTime = easternToUTC(intendedDate, startEastern.h, startEastern.m);
    }

    // ── Fix endTime ──
    let correctEndTime = null;
    const endEastern = parseTimeAsEastern(endTime, intendedDate);
    if (endEastern) {
      // Check for overnight: end time < start time means next day
      let endDate = intendedDate;
      if (startEastern && endEastern.h < startEastern.h && startEastern.h >= 18) {
        // Night job: start 9 PM, end 4 AM → end is next day
        const nextDay = new Date(intendedDate + 'T12:00:00Z');
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        endDate = nextDay.toISOString().slice(0, 10);
        issues.push(`⏰ Overnight job: start ${fmtHM(startEastern.h, startEastern.m)} → end ${fmtHM(endEastern.h, endEastern.m)} next day`);
      }
      correctEndTime = easternToUTC(endDate, endEastern.h, endEastern.m);
    }

    // ── Check for anomalies ──
    if (startEastern && endEastern) {
      const startMin = startEastern.h * 60 + startEastern.m;
      const endMin = endEastern.h * 60 + endEastern.m;
      const isOvernight = startEastern.h >= 18 && endEastern.h < startEastern.h;

      if (!isOvernight && endMin < startMin) {
        issues.push(`❓ End time (${fmtHM(endEastern.h, endEastern.m)}) before start (${fmtHM(startEastern.h, startEastern.m)}) — not clearly overnight`);
      }

      if (!isOvernight) {
        const durationMin = endMin - startMin;
        if (durationMin > 18 * 60) {
          issues.push(`❓ Shift over 18 hours (${(durationMin / 60).toFixed(1)}h)`);
        }
      }
    }

    // Build the fix payload
    const patch = {};
    if (jobDateNeedsFix) patch.jobDate = correctJobDate;
    if (startTime && correctStartTime && startTime !== correctStartTime) patch.startTime = correctStartTime;
    if (endTime && correctEndTime && endTime !== correctEndTime) patch.endTime = correctEndTime;

    const entry = {
      id,
      intendedDate,
      meta,
      offsetH,
      current: { jobDate, startTime: startTime || null, endTime: endTime || null },
      corrected: {
        jobDate: correctJobDate,
        startTime: correctStartTime,
        endTime: correctEndTime,
      },
      startEST: startEastern ? fmtHM(startEastern.h, startEastern.m) : '—',
      endEST: endEastern ? fmtHM(endEastern.h, endEastern.m) : '—',
      patch,
      issues,
    };

    if (Object.keys(patch).length === 0) {
      alreadyCorrect.push(entry);
    } else if (issues.some(i => i.startsWith('❓'))) {
      needsReview.push(entry);
    } else {
      autoFixable.push(entry);
    }
  }

  // ── Report ──
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`  AUTO-FIXABLE: ${autoFixable.length}  |  NEEDS REVIEW: ${needsReview.length}  |  ALREADY OK: ${alreadyCorrect.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // ── Auto-fixable table ──
  if (autoFixable.length > 0) {
    console.log('── AUTO-FIXABLE JOBS ──────────────────────────────────────────────────────────\n');
    console.log('Date       | Time (EST)          | Job Type                                    | Current jobDate              → Fixed jobDate');
    console.log('-----------|---------------------|---------------------------------------------|-------------------------------------------------------------');
    for (const j of autoFixable) {
      const notes = j.issues.length > 0 ? ` [${j.issues.join(', ')}]` : '';
      console.log(
        `${j.intendedDate} | ${j.startEST.padEnd(8)} → ${j.endEST.padEnd(8)} | ${j.meta.jobType.slice(0, 43).padEnd(43)} | ${j.current.jobDate} → ${j.corrected.jobDate}${notes}`,
      );
    }
  }

  // ── Needs review ──
  if (needsReview.length > 0) {
    console.log('\n── NEEDS REVIEW ───────────────────────────────────────────────────────────────\n');
    for (const j of needsReview) {
      console.log(`🔍 Job: ${j.id}`);
      console.log(`   Type:    ${j.meta.jobType}`);
      console.log(`   Driver:  ${j.meta.driver}`);
      console.log(`   Date:    ${j.intendedDate}  (UTC offset: ${j.offsetH}h = ${j.offsetH === 5 ? 'EST' : 'EDT'})`);
      console.log(`   Start:   ${j.current.startTime || '—'}  →  EST: ${j.startEST}`);
      console.log(`   End:     ${j.current.endTime || '—'}  →  EST: ${j.endEST}`);
      for (const issue of j.issues) {
        console.log(`   ${issue}`);
      }
      console.log();
    }
  }

  // ── Already correct ──
  if (alreadyCorrect.length > 0) {
    console.log(`\n✅ ${alreadyCorrect.length} job(s) already have correct UTC values.\n`);
  }

  // ── Sample of what changes look like ──
  console.log('\n── SAMPLE PATCHES (first 5) ───────────────────────────────────────────────────\n');
  const samples = [...autoFixable.slice(0, 5)];
  for (const s of samples) {
    console.log(`Job ${s.id.slice(0, 8)}… (${s.intendedDate}, ${s.startEST}→${s.endEST})`);
    console.log(`  jobDate:   ${s.current.jobDate}  →  ${s.corrected.jobDate}`);
    if (s.current.startTime) console.log(`  startTime: ${(s.current.startTime || '').padEnd(30)}  →  ${s.corrected.startTime}`);
    if (s.current.endTime) console.log(`  endTime:   ${(s.current.endTime || '').padEnd(30)}  →  ${s.corrected.endTime}`);
    console.log();
  }

  // ── Apply fixes ──
  if (!DRY_RUN && autoFixable.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`  APPLYING FIXES to ${autoFixable.length} auto-fixable jobs...`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    let success = 0;
    let failed = 0;
    for (const j of autoFixable) {
      try {
        const res = await fetch(`${API_URL}/jobs/${j.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(j.patch),
        });
        if (res.ok) {
          success++;
          process.stdout.write('.');
        } else {
          const err = await res.json().catch(() => ({}));
          console.log(`\n❌ Failed ${j.id.slice(0, 8)}…: ${err.message || res.status}`);
          failed++;
        }
      } catch (err) {
        console.log(`\n❌ Error ${j.id.slice(0, 8)}…: ${err.message}`);
        failed++;
      }
    }
    console.log(`\n\n✅ ${success} fixed  |  ❌ ${failed} failed`);

    if (needsReview.length > 0) {
      console.log(`\n⚠️  ${needsReview.length} job(s) still need manual review (see above).`);
    }
  } else if (!DRY_RUN && autoFixable.length === 0) {
    console.log('\nNo auto-fixable jobs to apply.');
  } else {
    console.log(`\n💡 Run with --apply to fix the ${autoFixable.length} auto-fixable jobs.`);
    if (needsReview.length > 0) {
      console.log(`⚠️  ${needsReview.length} job(s) need manual review before fixing.`);
    }
  }
}

main().catch(console.error);
