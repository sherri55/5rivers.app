// Comprehensive APOC script to add ticketIds and imageUrls fields to Job nodes
// This script handles edge cases and provides detailed reporting
// Run this in Neo4j Browser or via cypher-shell

// =============================================================================
// STEP 1: Initial Assessment
// =============================================================================
CALL {
  MATCH (j:Job)
  RETURN 
    count(j) as totalJobs,
    count(j.ticketIds) as jobsWithTicketIds,
    count(j.imageUrls) as jobsWithImageUrls,
    (count(j) - count(j.ticketIds)) as jobsMissingTicketIds,
    (count(j) - count(j.imageUrls)) as jobsMissingImageUrls
}
YIELD totalJobs, jobsWithTicketIds, jobsWithImageUrls, jobsMissingTicketIds, jobsMissingImageUrls
WITH totalJobs, jobsWithTicketIds, jobsWithImageUrls, jobsMissingTicketIds, jobsMissingImageUrls
CALL apoc.log.info("INITIAL ASSESSMENT - Total Jobs: " + totalJobs + ", Missing ticketIds: " + jobsMissingTicketIds + ", Missing imageUrls: " + jobsMissingImageUrls)
RETURN totalJobs, jobsWithTicketIds, jobsWithImageUrls, jobsMissingTicketIds, jobsMissingImageUrls;

// =============================================================================
// STEP 2: Handle ticketIds field
// =============================================================================

// Check for jobs with invalid ticketIds (not an array)
MATCH (j:Job)
WHERE j.ticketIds IS NOT NULL AND NOT apoc.meta.type(j.ticketIds) = "LIST"
WITH collect(j.id) as invalidTicketIds
CALL apoc.log.warn("Found jobs with invalid ticketIds format: " + toString(size(invalidTicketIds)) + " jobs")
RETURN "Jobs with invalid ticketIds: " + toString(size(invalidTicketIds)) as warning;

// Fix jobs with invalid ticketIds format
MATCH (j:Job)
WHERE j.ticketIds IS NOT NULL AND NOT apoc.meta.type(j.ticketIds) = "LIST"
SET j.ticketIds = CASE 
  WHEN j.ticketIds = "" THEN []
  WHEN apoc.meta.type(j.ticketIds) = "STRING" THEN [j.ticketIds]
  ELSE []
END
RETURN count(j) as fixedInvalidTicketIds;

// Add empty array to jobs missing ticketIds
MATCH (j:Job)
WHERE j.ticketIds IS NULL
SET j.ticketIds = []
RETURN count(j) as addedTicketIds;

// =============================================================================
// STEP 3: Handle imageUrls field
// =============================================================================

// Check for jobs with invalid imageUrls (should be string or null)
MATCH (j:Job)
WHERE j.imageUrls IS NOT NULL AND NOT apoc.meta.type(j.imageUrls) = "STRING"
WITH collect(j.id) as invalidImageUrls
CALL apoc.log.warn("Found jobs with invalid imageUrls format: " + toString(size(invalidImageUrls)) + " jobs")
RETURN "Jobs with invalid imageUrls: " + toString(size(invalidImageUrls)) as warning;

// Fix jobs with invalid imageUrls format
MATCH (j:Job)
WHERE j.imageUrls IS NOT NULL AND NOT apoc.meta.type(j.imageUrls) = "STRING"
SET j.imageUrls = null
RETURN count(j) as fixedInvalidImageUrls;

// Add null to jobs missing imageUrls
MATCH (j:Job)
WHERE j.imageUrls IS NULL
SET j.imageUrls = null
RETURN count(j) as addedImageUrls;

// =============================================================================
// STEP 4: Final Verification
// =============================================================================

// Final state check
MATCH (j:Job)
RETURN 
  count(j) as totalJobs,
  count(j.ticketIds) as jobsWithTicketIds,
  count(j.imageUrls) as jobsWithImageUrls,
  (count(j) - count(j.ticketIds)) as jobsMissingTicketIds,
  (count(j) - count(j.imageUrls)) as jobsMissingImageUrls;

// Validate data types
MATCH (j:Job)
WHERE j.ticketIds IS NOT NULL AND NOT apoc.meta.type(j.ticketIds) = "LIST"
RETURN count(j) as jobsWithInvalidTicketIds;

MATCH (j:Job)
WHERE j.imageUrls IS NOT NULL AND NOT apoc.meta.type(j.imageUrls) = "STRING"
RETURN count(j) as jobsWithInvalidImageUrls;

// =============================================================================
// STEP 5: Sample Data Inspection
// =============================================================================

// Show sample of jobs with their new fields
MATCH (j:Job)
RETURN 
  j.id as jobId,
  j.jobDate as jobDate,
  j.ticketIds as ticketIds,
  apoc.meta.type(j.ticketIds) as ticketIdsType,
  j.imageUrls as imageUrls,
  apoc.meta.type(j.imageUrls) as imageUrlsType
ORDER BY j.createdAt DESC
LIMIT 10;

// =============================================================================
// STEP 6: Create Index for Performance (Optional)
// =============================================================================

// Create index on ticketIds for better query performance
// Uncomment if you expect to query by ticketIds frequently
// CREATE INDEX job_ticket_ids IF NOT EXISTS FOR (j:Job) ON (j.ticketIds);

// =============================================================================
// COMPLETION MESSAGE
// =============================================================================
RETURN "Migration completed! All Job nodes should now have ticketIds (array) and imageUrls (string/null) fields." as message;
