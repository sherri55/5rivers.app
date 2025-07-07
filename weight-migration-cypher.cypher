// Neo4j Cypher script to migrate weight fields from string to array format
// Run this in Neo4j Browser or through cypher-shell

// =============================================================================
// WEIGHT MIGRATION SCRIPT
// =============================================================================
// This script converts weight fields from string format to array of floats
// 
// BEFORE: weight: "10.5 12.3 8.9" or weight: "[10.5, 12.3, 8.9]" or weight: "31.7"
// AFTER:  weight: [10.5, 12.3, 8.9] or weight: [31.7]
// =============================================================================

// 1. INSPECTION - Check current weight data types and formats
MATCH (j:Job)
WHERE j.weight IS NOT NULL
RETURN 
  j.id as jobId,
  j.weight as currentWeight,
  apoc.meta.type(j.weight) as weightType,
  j.jobDate as jobDate
ORDER BY j.jobDate DESC
LIMIT 10;

// 2. COUNT ANALYSIS - See how many jobs need migration
MATCH (j:Job)
WHERE j.weight IS NOT NULL
RETURN 
  count(j) as totalJobsWithWeight,
  count(CASE WHEN apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as alreadyArrays,
  count(CASE WHEN apoc.meta.isType(j.weight, 'STRING') THEN 1 END) as stringWeights,
  count(CASE WHEN apoc.meta.isType(j.weight, 'LONG') OR apoc.meta.isType(j.weight, 'DOUBLE') THEN 1 END) as numberWeights;

// 3. PREVIEW MIGRATION - Show what the conversion would look like (DRY RUN)
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND NOT apoc.meta.isType(j.weight, 'LIST')
WITH j,
  CASE 
    WHEN apoc.meta.isType(j.weight, 'STRING') THEN
      CASE
        WHEN j.weight STARTS WITH '[' AND j.weight ENDS WITH ']' THEN
          // Handle JSON array strings like "[10.5, 12.3, 8.9]"
          [x IN apoc.convert.fromJsonList(j.weight) | toFloat(x)]
        ELSE
          // Handle space-separated strings like "10.5 12.3 8.9"
          [x IN split(j.weight, ' ') WHERE trim(x) <> '' | toFloat(trim(x))]
      END
    WHEN apoc.meta.isType(j.weight, 'LONG') OR apoc.meta.isType(j.weight, 'DOUBLE') THEN
      // Handle single numbers
      [toFloat(j.weight)]
    ELSE
      []
  END as newWeightArray
RETURN 
  j.id as jobId,
  j.weight as oldWeight,
  apoc.meta.type(j.weight) as oldType,
  newWeightArray,
  size(newWeightArray) as arrayLength
ORDER BY j.jobDate DESC
LIMIT 10;

// 4. ACTUAL MIGRATION - Convert string/number weights to arrays
// WARNING: This will modify your data! Make sure to backup first!

// Step 4a: Handle JSON array strings (like "[10.5, 12.3, 8.9]")
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND apoc.meta.isType(j.weight, 'STRING')
  AND j.weight STARTS WITH '[' 
  AND j.weight ENDS WITH ']'
WITH j, apoc.convert.fromJsonList(j.weight) as parsedWeights
SET j.weight = [x IN parsedWeights | toFloat(x)]
RETURN count(j) as jsonArraysConverted;

// Step 4b: Handle space-separated strings (like "10.5 12.3 8.9")
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND apoc.meta.isType(j.weight, 'STRING')
  AND NOT (j.weight STARTS WITH '[' AND j.weight ENDS WITH ']')
WITH j, split(j.weight, ' ') as weightParts
SET j.weight = [x IN weightParts WHERE trim(x) <> '' | toFloat(trim(x))]
RETURN count(j) as spaceDelimitedConverted;

// Step 4c: Handle single number values
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND (apoc.meta.isType(j.weight, 'LONG') OR apoc.meta.isType(j.weight, 'DOUBLE'))
SET j.weight = [toFloat(j.weight)]
RETURN count(j) as singleNumbersConverted;

// 5. VERIFICATION - Check that migration completed successfully
MATCH (j:Job)
WHERE j.weight IS NOT NULL
RETURN 
  count(j) as totalJobsWithWeight,
  count(CASE WHEN apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as arrayWeights,
  count(CASE WHEN NOT apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as nonArrayWeights;

// 6. SAMPLE VERIFICATION - Show examples of converted weights
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND apoc.meta.isType(j.weight, 'LIST')
RETURN 
  j.id as jobId,
  j.weight as weightArray,
  size(j.weight) as arrayLength,
  reduce(total = 0.0, w IN j.weight | total + w) as totalWeight,
  j.jobDate as jobDate
ORDER BY j.jobDate DESC
LIMIT 10;

// =============================================================================
// ROLLBACK SCRIPT (if needed)
// =============================================================================
// If you need to rollback the migration (convert arrays back to strings):

// Convert arrays back to space-separated strings
// MATCH (j:Job)
// WHERE j.weight IS NOT NULL 
//   AND apoc.meta.isType(j.weight, 'LIST')
// SET j.weight = reduce(result = '', w IN j.weight | 
//   CASE 
//     WHEN result = '' THEN toString(w)
//     ELSE result + ' ' + toString(w)
//   END
// )
// RETURN count(j) as rolledBackToStrings;

// =============================================================================
// NOTES:
// =============================================================================
// 1. This script requires APOC (Awesome Procedures on Cypher) plugin
// 2. Always backup your database before running migration scripts
// 3. Test on a small dataset first
// 4. The script handles these formats:
//    - JSON arrays: "[10.5, 12.3, 8.9]" → [10.5, 12.3, 8.9]
//    - Space-separated: "10.5 12.3 8.9" → [10.5, 12.3, 8.9]
//    - Single numbers: 31.7 → [31.7]
// 5. After migration, update your application code to expect weight as [Float]
// =============================================================================
