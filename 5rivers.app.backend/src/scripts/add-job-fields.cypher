// Script to add ticketIds and imageUrls fields to existing Job nodes
// Run this in Neo4j Browser or via cypher-shell

// First, let's check the current state of Job nodes
MATCH (j:Job)
RETURN 
  count(j) as totalJobs,
  count(j.ticketIds) as jobsWithTicketIds,
  count(j.imageUrls) as jobsWithImageUrls,
  (count(j) - count(j.ticketIds)) as jobsMissingTicketIds,
  (count(j) - count(j.imageUrls)) as jobsMissingImageUrls;

// Add ticketIds field as empty array to jobs that don't have it
MATCH (j:Job)
WHERE j.ticketIds IS NULL
SET j.ticketIds = []
RETURN count(j) as jobsUpdatedWithTicketIds;

// Add imageUrls field as null to jobs that don't have it
MATCH (j:Job)
WHERE j.imageUrls IS NULL
SET j.imageUrls = null
RETURN count(j) as jobsUpdatedWithImageUrls;

// Verify the update by checking the state again
MATCH (j:Job)
RETURN 
  count(j) as totalJobs,
  count(j.ticketIds) as jobsWithTicketIds,
  count(j.imageUrls) as jobsWithImageUrls,
  (count(j) - count(j.ticketIds)) as jobsMissingTicketIds,
  (count(j) - count(j.imageUrls)) as jobsMissingImageUrls;

// Show a sample of updated jobs to verify structure
MATCH (j:Job)
RETURN j.id, j.ticketIds, j.imageUrls, j.jobDate
LIMIT 5;
