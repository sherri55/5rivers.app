# Weight Field Migration: String to Array

This document outlines the migration of the `weight` field from string format to array of floats format, similar to how `ticketIds` was handled.

## Overview

**Before Migration:**
- `weight: "10.5 12.3 8.9"` (space-separated string)
- `weight: "[10.5, 12.3, 8.9]"` (JSON array string)
- `weight: "31.7"` (single value string)
- `weight: 31.7` (single number)

**After Migration:**
- `weight: [10.5, 12.3, 8.9]` (array of floats)
- `weight: [31.7]` (single value as array)

## Files Modified

### Backend Changes

#### 1. GraphQL Schema (`src/schema/typeDefs.ts`)
```typescript
// BEFORE
weight: String

// AFTER  
weight: [Float]
```

#### 2. Resolvers (`src/schema/resolvers.ts`)
- Added `parseWeights` helper function
- Updated all job property mappings to include weight parsing
- Handles backward compatibility with legacy string formats

#### 3. Calculation Service (`src/services/calculationService.ts`)
- Updated tonnage calculation to handle array format
- Maintains backward compatibility with string formats
- Improved weight parsing logic

#### 4. PDF Service (`src/services/pdfService.ts`)
- Updated `JobData` interface to use `weight?: number[]`
- Modified weight calculation in PDF generation
- Handles both array and legacy string formats

### Frontend Changes

#### 1. Job Edit Modal (`src/components/modals/JobEditModal.tsx`)
- Updated weight initialization to handle arrays
- Modified form submission to send `weight` as array of floats
- Improved tonnage value handling

#### 2. Job Detail Modal (`src/components/modals/JobDetailModal.tsx`)
- Enhanced weight display to show individual values and total
- Format: `"10.5 + 12.3 + 8.9 = 31.7 tons"`

#### 3. Job Edit Modal New (`src/components/modals/JobEditModal_New.tsx`)
- Updated weight display format
- Consistent with JobDetailModal improvements

## Migration Scripts

### 1. TypeScript Migration Script
**File:** `src/scripts/migrate-weights-to-array.ts`
**Usage:** `npm run migrate-weights`

Features:
- Inspects current weight data
- Shows preview of migration changes
- Performs the migration
- Provides verification
- Handles all weight formats (string, JSON array string, number)

### 2. Neo4j Cypher Script
**File:** `weight-migration-cypher.cypher`
**Usage:** Run in Neo4j Browser or cypher-shell

Features:
- Direct database migration using Cypher queries
- Requires APOC plugin
- Includes inspection, migration, and verification steps
- Provides rollback script if needed

## Migration Process

### Option 1: Using TypeScript Script (Recommended)
```bash
cd 5rivers.app.backend
npm run migrate-weights
```

### Option 2: Using Neo4j Cypher Script
1. Open Neo4j Browser
2. Copy and paste queries from `weight-migration-cypher.cypher`
3. Run step by step (inspection → migration → verification)

### Option 3: Manual Database Update
```cypher
// Convert JSON array strings
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND apoc.meta.isType(j.weight, 'STRING')
  AND j.weight STARTS WITH '[' 
  AND j.weight ENDS WITH ']'
SET j.weight = [x IN apoc.convert.fromJsonList(j.weight) | toFloat(x)]

// Convert space-separated strings
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND apoc.meta.isType(j.weight, 'STRING')
  AND NOT (j.weight STARTS WITH '[' AND j.weight ENDS WITH ']')
SET j.weight = [x IN split(j.weight, ' ') WHERE trim(x) <> '' | toFloat(trim(x))]

// Convert single numbers
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND (apoc.meta.isType(j.weight, 'LONG') OR apoc.meta.isType(j.weight, 'DOUBLE'))
SET j.weight = [toFloat(j.weight)]
```

## Backward Compatibility

The application maintains backward compatibility during the transition:

### Backend
- `parseWeights()` function handles all legacy formats
- Calculation service supports both array and string formats
- PDF service includes fallback logic

### Frontend  
- Job forms handle both array and string initialization
- Display components show appropriate format for both types
- Form submission converts tonnage values to float arrays

## Verification

After migration, verify the changes:

### Database Verification
```cypher
MATCH (j:Job)
WHERE j.weight IS NOT NULL
RETURN 
  count(j) as totalJobs,
  count(CASE WHEN apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as arrayWeights,
  count(CASE WHEN NOT apoc.meta.isType(j.weight, 'LIST') THEN 1 END) as nonArrayWeights
```

### Application Testing
1. ✅ Create new tonnage jobs
2. ✅ Edit existing tonnage jobs
3. ✅ View job details
4. ✅ Generate PDF invoices
5. ✅ Verify calculations are correct

## Benefits

### 1. **Data Consistency**
- Weight is now stored in a structured format
- No more string parsing inconsistencies
- Type safety in GraphQL

### 2. **Improved Performance**
- Faster weight calculations
- Reduced string parsing overhead
- Better database queries

### 3. **Enhanced User Experience**
- Better weight display in UI
- Individual weight values visible
- Clear total calculations

### 4. **Developer Experience**
- Type-safe weight handling
- Consistent with ticketIds pattern
- Easier to work with arrays vs strings

## Testing

### Test Cases Covered
- ✅ Legacy string weights: `"10.5 12.3 8.9"`
- ✅ JSON array strings: `"[10.5, 12.3, 8.9]"`
- ✅ Single value strings: `"31.7"`
- ✅ Single numbers: `31.7`
- ✅ Array format: `[10.5, 12.3, 8.9]`
- ✅ Empty/null weights
- ✅ PDF generation with weight arrays
- ✅ Frontend display and editing
- ✅ Calculation service accuracy

### Edge Cases Handled
- Malformed JSON arrays
- Extra spaces in strings
- Non-numeric values
- Empty weight arrays
- Mixed data types

## Rollback (If Needed)

If you need to rollback to string format:

```cypher
MATCH (j:Job)
WHERE j.weight IS NOT NULL 
  AND apoc.meta.isType(j.weight, 'LIST')
SET j.weight = reduce(result = '', w IN j.weight | 
  CASE 
    WHEN result = '' THEN toString(w)
    ELSE result + ' ' + toString(w)
  END
)
```

## Notes

1. **APOC Required**: Neo4j migration scripts require APOC plugin
2. **Backup First**: Always backup database before migration
3. **Test Environment**: Test migration on development environment first
4. **Gradual Rollout**: Consider testing with a subset of data initially
5. **Monitor Performance**: Watch for any performance impacts after migration

## Related Files

- `src/schema/typeDefs.ts` - GraphQL type definitions
- `src/schema/resolvers.ts` - GraphQL resolvers with parsing
- `src/services/calculationService.ts` - Weight calculations
- `src/services/pdfService.ts` - PDF generation
- `src/components/modals/JobEditModal.tsx` - Job editing UI
- `src/components/modals/JobDetailModal.tsx` - Job display UI
- `src/scripts/migrate-weights-to-array.ts` - Migration script
- `weight-migration-cypher.cypher` - Direct Neo4j migration
