################################################################################
#              SITECORE WORKFLOW APPROVE BY STATE VALUE
#     Finds item versions whose __Workflow state is Draft (or Awaiting)
#     and sets it to the corresponding Approved state — determined purely
#     from the current field value, no template / __Workflow lookup needed.
#
#  HOW TO USE:
#    1. Set $parentScopeId (path or GUID) — empty = full database
#    2. Set $workflowFilter = 'Pages' | 'Datasources' | 'Both'
#    3. Run with $dryRun = $true (default) to REPORT only
#    4. Set $dryRun = $false and re-run to SET Approved (and optionally update __Revision)
#    5. Set $updateRevision = $false to skip __Revision updates (default $true)
#    6. Set $stateFilter = 'DraftOnly' to only report/fix Draft state; 'AllNonApproved' = any non-Approved (default)
#
#  RUNS IN: SPE console or PowerShell with SQL Server access
#  CAUTION: Back up the database before running with $dryRun = $false!
################################################################################
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                           FLAGS (CHANGE THESE)                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
$dryRun = $true
$parentScopeId = '{604BB7E8-BED0-4485-8673-45E7D5D5636F}'   # Path or GUID; empty = all items
$targetDatabase = 'master'
# $true  = approve only the latest version per language (recommended)
# $false = approve ALL historical versions for every language
$latestVersionOnly = $true
$dryRunListCap = 500
$sqlTimeout = 300
$logLevel = 'Verbose'   # 'Quiet' | 'Normal' | 'Verbose'
$connectionString = ''
# Workflow filter: which workflow's items to approve.
$workflowFilter = 'Both'   # 'Pages' | 'Datasources' | 'Both'
# When $dryRun = $false: update __Revision (VersionedFields) for modified item versions.
# Set to $false to only set workflow state to Approved and skip __Revision updates.
$updateRevision = $true
# Which versions to report/fix:
#   'AllNonApproved' = any version in Draft or Awaiting state → set to Approved
#   'DraftOnly'      = only versions currently in Draft state → set to Approved
$stateFilter = 'AllNonApproved'   # 'AllNonApproved' | 'DraftOnly'
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                      GUID NORMALISATION HELPERS                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
function Format-GuidForSql {
    param([string]$Guid)
    return $Guid.Trim().Trim('{', '}').ToUpperInvariant()
}
function Format-GuidWithBraces {
    param([string]$Guid)
    $clean = $Guid.Trim().Trim('{', '}').ToUpperInvariant()
    return "{$clean}"
}
function Normalize-GuidValue {
    param([string]$Value)
    if ($null -eq $Value -or (($Value -as [string]).Trim().Length -eq 0)) { return '' }
    return $Value.Trim().Trim('{', '}').ToUpperInvariant()
}
function Sanitize-SqlString {
    param([string]$Value)
    return $Value.Replace("'", "''")
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    SITECORE SYSTEM FIELD IDS                              ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
$allSystemFieldIds = @{
    '__Revision'       = '{8CDC337E-A112-42FB-BBB4-4143751E123F}'
    '__Workflow state'  = '{3E431DE1-525E-47A3-B6B0-1CCBEC3A8C98}'
}
$pagesWorkflowStates = @{
    Draft    = '{F75A14DD-F792-4904-9BDD-55EC92AABADB}'
    Awaiting = '{99B6293F-1A9C-429B-AF3E-EBDEE37DC416}'
    Approved = '{E1E4A557-0D4A-4987-8CED-6D0A5C614A1F}'
}
$datasourcesWorkflowStates = @{
    Draft    = '{DBE4FEB5-692A-4258-9DA9-78ACF275ED52}'
    Awaiting = '{E3EFFFFC-F048-4A8F-9551-EC88C2205D62}'
    Approved = '{91C7F73F-97F8-401A-B5C8-F0E0D162816B}'
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                        SQL & LOG HELPERS                                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
function Get-SqlConnectionString {
    param($DatabaseName = 'master')
    try {
        $settingsType = [type]'Sitecore.Configuration.Settings, Sitecore.Kernel'
        $cs = $settingsType::GetConnectionString($DatabaseName)
        if ($cs -and $cs.Trim().Length -gt 0) {
            Write-Log "  Connection string resolved via Sitecore.Configuration.Settings" -Level 'Verbose' -Color Gray
            return $cs
        }
    }
    catch { }
    try {
        $cmType = [type]'System.Configuration.ConfigurationManager, System.Configuration'
        $cs = $cmType::ConnectionStrings[$DatabaseName]
        if ($cs -and $cs.ConnectionString -and $cs.ConnectionString.Trim().Length -gt 0) {
            Write-Log "  Connection string resolved via ConfigurationManager" -Level 'Verbose' -Color Gray
            return $cs.ConnectionString
        }
    }
    catch { }
    try {
        $contextType = [type]'Sitecore.Context, Sitecore.Kernel'
        $db = $contextType::ContentDatabase
        if (-not $db) {
            $factoryType = [type]'Sitecore.Configuration.Factory, Sitecore.Kernel'
            $db = $factoryType::GetDatabase($DatabaseName)
        }
        if ($db) {
            $connProp = $db.GetType().GetProperty('ConnectionStringName')
            if ($connProp) {
                $connName = $connProp.GetValue($db)
                if ($connName) {
                    $cmType = [type]'System.Configuration.ConfigurationManager, System.Configuration'
                    $cs = $cmType::ConnectionStrings[$connName]
                    if ($cs -and $cs.ConnectionString) { return $cs.ConnectionString }
                }
            }
        }
    }
    catch { }
    try {
        $db = Get-Database -Name $DatabaseName -ErrorAction SilentlyContinue
        if ($db) {
            foreach ($provider in $db.DataProviders) {
                $connField = $provider.GetType().GetField(
                    '_connectionString',
                    [System.Reflection.BindingFlags]'NonPublic,Instance'
                )
                if ($connField) {
                    $cs = $connField.GetValue($provider)
                    if ($cs -and $cs.Trim().Length -gt 0) {
                        Write-Log "  Connection string resolved via DataProvider reflection" -Level 'Verbose' -Color Gray
                        return $cs
                    }
                }
            }
        }
    }
    catch { }
    throw "Could not resolve connection string for '$DatabaseName'. Set `$connectionString manually at the top of the script."
}
function Invoke-SqlScalar {
    param([string]$Query)
    $cmd = New-Object -TypeName System.Data.SqlClient.SqlCommand -ArgumentList $Query, $script:sqlConn
    $cmd.CommandTimeout = $sqlTimeout
    try {
        $result = $cmd.ExecuteScalar()
        if ($null -eq $result -or ($result.GetType().Name -eq 'DBNull')) { return 0 }
        return $result
    }
    finally { $cmd.Dispose() }
}
function Invoke-SqlRows {
    param([string]$Query)
    $cmd = New-Object -TypeName System.Data.SqlClient.SqlCommand -ArgumentList $Query, $script:sqlConn
    $cmd.CommandTimeout = $sqlTimeout
    $rows = @()
    $reader = $null
    try {
        $reader = $cmd.ExecuteReader()
        $cols = @(0..($reader.FieldCount - 1) | ForEach-Object { $reader.GetName($_) })
        while ($reader.Read()) {
            $row = @{}
            foreach ($col in $cols) { $row[$col] = $reader[$col] }
            $rows += $row
        }
    }
    finally {
        if ($reader) { try { $reader.Close() } catch { } }
        $cmd.Dispose()
    }
    return , $rows
}
function Invoke-SqlNonQuery {
    param([string]$Query)
    $cmd = New-Object -TypeName System.Data.SqlClient.SqlCommand -ArgumentList "SET NOCOUNT OFF; $Query", $script:sqlConn
    $cmd.CommandTimeout = $sqlTimeout
    try { return $cmd.ExecuteNonQuery() } finally { $cmd.Dispose() }
}
function Invoke-SqlStatement {
    param([string]$Query)
    $cmd = New-Object -TypeName System.Data.SqlClient.SqlCommand -ArgumentList "SET NOCOUNT ON; $Query", $script:sqlConn
    $cmd.CommandTimeout = $sqlTimeout
    try { $cmd.ExecuteNonQuery() | Out-Null } finally { $cmd.Dispose() }
}
$script:logLevelOrder = @{ Quiet = 0; Normal = 1; Verbose = 2 }
function Write-Log {
    param([string]$Message, [string]$Level = 'Normal', [ConsoleColor]$Color = 'White')
    $cur = $script:logLevelOrder[$logLevel]; if ($null -eq $cur) { $cur = 1 }
    $req = $script:logLevelOrder[$Level]; if ($null -eq $req) { $req = 1 }
    if ($req -le $cur) { Write-Host $Message -ForegroundColor $Color }
}
function Write-Section {
    param([string]$Title, [ConsoleColor]$Color = 'Cyan', [string]$Level = 'Normal')
    Write-Log '' -Level $Level
    Write-Log ('=' * 78) -Level $Level -Color $Color
    Write-Log "  $Title" -Level $Level -Color $Color
    Write-Log ('=' * 78) -Level $Level -Color $Color
}
function Write-Check {
    param([string]$Label, $Value, [bool]$IsIssue = $false)
    $dv = if ($Value -is [long] -or $Value -is [int] -or $Value -is [int64]) { $Value.ToString('N0') } else { "$Value" }
    Write-Log ("  {0,-50} {1,10}" -f $Label, $dv) -Level 'Normal' -Color $(if ($IsIssue) { 'Red' } else { 'Green' })
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                      PARENT SCOPE RESOLUTION                              ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
$script:scopeLabel = 'ALL items'
$script:scopeTempTable = $false
function Resolve-ParentScope {
    param([string]$ParentId)
    if (-not $ParentId -or $ParentId.Trim().Length -eq 0) {
        $script:scopeLabel = 'ALL items (full database)'
        return
    }
    $raw = $ParentId.Trim()
    if ($raw.StartsWith('/')) {
        Write-Log "  Resolving path '$raw'..." -Level 'Verbose' -Color Gray
        $safe = Sanitize-SqlString $raw
        $resolved = Invoke-SqlScalar -Query @"
;WITH PathCTE AS (
    SELECT ID, CAST('/' + Name AS nvarchar(max)) AS FullPath
    FROM   Items WHERE ParentID = '00000000-0000-0000-0000-000000000000'
    UNION ALL
    SELECT i.ID, CAST(p.FullPath + '/' + i.Name AS nvarchar(max))
    FROM   Items i INNER JOIN PathCTE p ON i.ParentID = p.ID
)
SELECT TOP 1 CONVERT(varchar(36), ID) FROM PathCTE WHERE FullPath = '$safe'
OPTION (MAXRECURSION 0)
"@
        if (-not $resolved -or $resolved -eq 0) {
            throw "Parent scope path not found: $raw"
        }
        $raw = "$resolved"
        Write-Log "  Resolved to: $raw" -Level 'Verbose' -Color Green
    }
    $scopeSql = Format-GuidForSql $raw
    $parentName = Invoke-SqlScalar -Query "SELECT Name FROM Items WHERE ID = '$scopeSql'"
    if (-not $parentName -or $parentName -eq 0) { throw "Parent scope item not found: $scopeSql" }
    Write-Log "  Building descendant list for '$parentName' ($scopeSql)..." -Level 'Verbose' -Color Gray
    Invoke-SqlStatement -Query "IF OBJECT_ID('tempdb..#ScopeItems') IS NOT NULL DROP TABLE #ScopeItems;"
    Invoke-SqlStatement -Query @"
;WITH Descendants AS (
    SELECT ID FROM Items WHERE ID = '$scopeSql'
    UNION ALL
    SELECT i.ID FROM Items i INNER JOIN Descendants d ON i.ParentID = d.ID
)
SELECT ID INTO #ScopeItems FROM Descendants
OPTION (MAXRECURSION 0);
"@
    Invoke-SqlStatement -Query "CREATE CLUSTERED INDEX IX_ScopeItems ON #ScopeItems(ID);"
    $cnt = [long](Invoke-SqlScalar -Query "SELECT COUNT(*) FROM #ScopeItems")
    $script:scopeLabel = "'$parentName' ($scopeSql) — $($cnt.ToString('N0')) items"
    $script:scopeTempTable = $true
    Write-Log "  Scope: $($cnt.ToString('N0')) items under '$parentName'" -Level 'Normal' -Color Green
}
function Get-ScopeClause {
    param([string]$Column = 'ItemId')
    if ($script:scopeTempTable) { return "AND $Column IN (SELECT ID FROM #ScopeItems)" }
    return ''
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║         LATEST-VERSION JOIN (optional — skips historical versions)        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
function Get-LatestVersionJoin {
    param([string]$Alias = 'ws')
    if (-not $latestVersionOnly) { return '' }
    $scope = Get-ScopeClause 'lv_inner.ItemId'
    return @"
INNER JOIN (
    SELECT lv_inner.ItemId, lv_inner.[Language], MAX(lv_inner.[Version]) AS [Version]
    FROM   VersionedFields lv_inner
    WHERE  1 = 1 $scope
    GROUP BY lv_inner.ItemId, lv_inner.[Language]
) lv ON $Alias.ItemId = lv.ItemId AND $Alias.[Language] = lv.[Language] AND $Alias.[Version] = lv.[Version]
"@
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    STATE MAPPING TABLE                                    ║
# ║  Maps non-approved __Workflow state values → their Approved state.       ║
# ║  No template or __Workflow lookup — purely value-based.                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
function Build-StateMappingTable {
    Write-Section 'Building state mapping table' -Color Cyan

    $wfFilter = $workflowFilter.Trim()
    if ($wfFilter -notin @('Pages', 'Datasources', 'Both')) {
        Write-Log "  WARNING: workflowFilter '$workflowFilter' invalid — using 'Both'." -Level 'Normal' -Color Yellow
        $wfFilter = 'Both'
    }
    Write-Log "  Workflow filter : $wfFilter" -Level 'Normal' -Color White
    Write-Log "  State filter    : $stateFilter" -Level 'Normal' -Color White

    Invoke-SqlStatement -Query @"
IF OBJECT_ID('tempdb..#StateMapping') IS NOT NULL DROP TABLE #StateMapping;
CREATE TABLE #StateMapping (
    OldStateId      uniqueidentifier NOT NULL,
    ApprovedStateId uniqueidentifier NOT NULL,
    WorkflowLabel   varchar(20)      NOT NULL,
    StateLabel      varchar(20)      NOT NULL
);
CREATE CLUSTERED INDEX IX_SM ON #StateMapping(OldStateId);
"@

    $values = @()
    $draftOnly = ($stateFilter -eq 'DraftOnly')

    # Pages workflow mappings
    if ($wfFilter -eq 'Pages' -or $wfFilter -eq 'Both') {
        $pDraft    = Format-GuidForSql $pagesWorkflowStates.Draft
        $pAwaiting = Format-GuidForSql $pagesWorkflowStates.Awaiting
        $pApproved = Format-GuidForSql $pagesWorkflowStates.Approved

        $values += "('$pDraft', '$pApproved', 'Pages', 'Draft')"
        Write-Log "    Pages Draft    → Pages Approved" -Level 'Normal' -Color Gray

        if (-not $draftOnly) {
            $values += "('$pAwaiting', '$pApproved', 'Pages', 'Awaiting')"
            Write-Log "    Pages Awaiting → Pages Approved" -Level 'Normal' -Color Gray
        }
    }

    # Datasources workflow mappings
    if ($wfFilter -eq 'Datasources' -or $wfFilter -eq 'Both') {
        $dsDraft    = Format-GuidForSql $datasourcesWorkflowStates.Draft
        $dsAwaiting = Format-GuidForSql $datasourcesWorkflowStates.Awaiting
        $dsApproved = Format-GuidForSql $datasourcesWorkflowStates.Approved

        $values += "('$dsDraft', '$dsApproved', 'Datasources', 'Draft')"
        Write-Log "    DS Draft       → DS Approved" -Level 'Normal' -Color Gray

        if (-not $draftOnly) {
            $values += "('$dsAwaiting', '$dsApproved', 'Datasources', 'Awaiting')"
            Write-Log "    DS Awaiting    → DS Approved" -Level 'Normal' -Color Gray
        }
    }

    if ($values.Count -eq 0) {
        Write-Log "  No state mappings generated — nothing to do." -Level 'Normal' -Color Yellow
        return $false
    }

    Invoke-SqlStatement -Query "INSERT INTO #StateMapping (OldStateId, ApprovedStateId, WorkflowLabel, StateLabel) VALUES $($values -join ',')"
    Write-Log "  #StateMapping: $($values.Count) mapping(s) inserted" -Level 'Normal' -Color Green
    return $true
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║            NOT-APPROVED DETECTION                                         ║
# ║  Finds VersionedFields rows where __Workflow state matches a known       ║
# ║  non-approved value from #StateMapping.                                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
function Get-NotApprovedCount {
    $wfStateFieldId = Format-GuidForSql $allSystemFieldIds['__Workflow state']
    $lvJoin = Get-LatestVersionJoin 'ws'
    $scopeClause = Get-ScopeClause 'ws.ItemId'

    $query = @"
SELECT COUNT_BIG(*) AS Cnt
FROM   VersionedFields ws
INNER JOIN #StateMapping sm
    ON UPPER(REPLACE(REPLACE(ws.[Value], '{', ''), '}', ''))
     = UPPER(REPLACE(REPLACE(CAST(sm.OldStateId AS varchar(36)), '{', ''), '}', ''))
$lvJoin
WHERE  ws.FieldId = '$wfStateFieldId'
$scopeClause
"@
    return [long](Invoke-SqlScalar -Query $query)
}
function Get-NotApprovedRows {
    param([int]$Top = 0)
    $wfStateFieldId = Format-GuidForSql $allSystemFieldIds['__Workflow state']
    $lvJoin = Get-LatestVersionJoin 'ws'
    $scopeClause = Get-ScopeClause 'ws.ItemId'
    $topClause = if ($Top -gt 0) { "TOP $Top" } else { '' }

    $query = @"
SELECT $topClause
    CONVERT(varchar(36), ws.ItemId)     AS ItemId,
    ISNULL(i.Name, '')                  AS ItemName,
    ws.[Language],
    ws.[Version],
    ws.[Value]                          AS CurrentState,
    sm.WorkflowLabel,
    sm.StateLabel
FROM   VersionedFields ws
INNER JOIN #StateMapping sm
    ON UPPER(REPLACE(REPLACE(ws.[Value], '{', ''), '}', ''))
     = UPPER(REPLACE(REPLACE(CAST(sm.OldStateId AS varchar(36)), '{', ''), '}', ''))
INNER JOIN Items i ON i.ID = ws.ItemId
$lvJoin
WHERE  ws.FieldId = '$wfStateFieldId'
$scopeClause
ORDER BY i.Name, ws.[Language], ws.[Version]
"@
    return Invoke-SqlRows -Query $query
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║            SET WORKFLOW STATE TO APPROVED                                 ║
# ║  Updates __Workflow state values using #StateMapping.                     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
$script:trackingInitialized = $false
function Initialize-ModifiedItemsTracking {
    Invoke-SqlStatement -Query @"
IF OBJECT_ID('tempdb..#ModifiedItems') IS NOT NULL DROP TABLE #ModifiedItems;
CREATE TABLE #ModifiedItems (ItemId uniqueidentifier NOT NULL);
"@
    $script:trackingInitialized = $true
    Write-Log '  Initialized #ModifiedItems tracking table' -Level 'Verbose' -Color Gray
}
function Set-WorkflowStateToApproved {
    $wfStateFieldId = Format-GuidForSql $allSystemFieldIds['__Workflow state']
    $lvJoin = Get-LatestVersionJoin 'ws'
    $scopeClause = Get-ScopeClause 'ws.ItemId'
    $outputClause = if ($script:trackingInitialized) { 'OUTPUT INSERTED.ItemId INTO #ModifiedItems(ItemId)' } else { '' }

    $updated = Invoke-SqlNonQuery -Query @"
UPDATE ws
SET    ws.[Value]  = CONVERT(nvarchar(36), sm.ApprovedStateId),
       ws.Updated  = GETUTCDATE()
$outputClause
FROM   VersionedFields ws
INNER JOIN #StateMapping sm
    ON UPPER(REPLACE(REPLACE(ws.[Value], '{', ''), '}', ''))
     = UPPER(REPLACE(REPLACE(CAST(sm.OldStateId AS varchar(36)), '{', ''), '}', ''))
$lvJoin
WHERE  ws.FieldId = '$wfStateFieldId'
$scopeClause
"@

    Write-Log "  __Workflow state — updated: $($updated.ToString('N0'))" `
        -Level 'Normal' -Color $(if ($updated -gt 0) { 'Yellow' } else { 'Gray' })
    return $updated
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║            __REVISION UPDATE (post-fix)                                   ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
function Finalize-RevisionUpdates {
    if (-not $script:trackingInitialized) {
        Write-Log '  Tracking not initialised — skipping __Revision update.' -Level 'Normal' -Color Yellow
        return 0
    }
    $revFieldId = Format-GuidForSql $allSystemFieldIds['__Revision']
    Invoke-SqlStatement -Query @"
IF OBJECT_ID('tempdb..#ModifiedDistinct') IS NOT NULL DROP TABLE #ModifiedDistinct;
SELECT DISTINCT ItemId INTO #ModifiedDistinct FROM #ModifiedItems;
CREATE CLUSTERED INDEX IX_ModD ON #ModifiedDistinct(ItemId);
"@
    $cnt = [long](Invoke-SqlScalar -Query 'SELECT COUNT(*) FROM #ModifiedDistinct')
    if ($cnt -eq 0) {
        Write-Log '  No items modified — skipping __Revision update.' -Level 'Normal' -Color Green
        try { Invoke-SqlStatement -Query 'DROP TABLE #ModifiedDistinct' } catch { }
        return 0
    }
    Write-Section "__Revision update for $($cnt.ToString('N0')) modified item(s)" -Color Cyan
    $updated = Invoke-SqlNonQuery -Query @"
UPDATE vf
SET    vf.[Value]  = CONVERT(varchar(36), NEWID()),
       vf.Updated  = GETUTCDATE()
FROM   VersionedFields vf
INNER JOIN #ModifiedDistinct m ON m.ItemId = vf.ItemId
WHERE  vf.FieldId = '$revFieldId'
"@
    $inserted = Invoke-SqlNonQuery -Query @"
INSERT INTO VersionedFields (Id, ItemId, [Language], [Version], FieldId, [Value], Created, Updated)
SELECT NEWID(), v.ItemId, v.[Language], v.[Version], '$revFieldId',
       CONVERT(varchar(36), NEWID()), GETUTCDATE(), GETUTCDATE()
FROM  (
    SELECT DISTINCT ItemId, [Language], [Version]
    FROM   VersionedFields
    WHERE  ItemId IN (SELECT ItemId FROM #ModifiedDistinct)
) v
WHERE NOT EXISTS (
    SELECT 1 FROM VersionedFields vf2
    WHERE  vf2.ItemId    = v.ItemId
    AND    vf2.[Language] = v.[Language]
    AND    vf2.[Version]  = v.[Version]
    AND    vf2.FieldId    = '$revFieldId'
)
"@
    Write-Log "  __Revision — updated: $($updated.ToString('N0')), inserted: $($inserted.ToString('N0'))" `
        -Level 'Normal' -Color Green
    try { Invoke-SqlStatement -Query 'DROP TABLE #ModifiedDistinct' } catch { }
    return ($updated + $inserted)
}
function Cleanup-Tracking {
    if ($script:trackingInitialized) {
        try { Invoke-SqlStatement -Query "IF OBJECT_ID('tempdb..#ModifiedItems') IS NOT NULL DROP TABLE #ModifiedItems" } catch { }
        $script:trackingInitialized = $false
    }
}
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                              MAIN                                         ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
$startTime = Get-Date
Write-Section 'Sitecore workflow approve by state value' -Color Cyan
Write-Log "  Dry run            : $dryRun"            -Level 'Normal' -Color $(if ($dryRun) { 'Yellow' } else { 'Red' })
Write-Log "  Latest version only: $latestVersionOnly" -Level 'Normal' -Color White
Write-Log "  Workflow filter    : $workflowFilter"    -Level 'Normal' -Color White
Write-Log "  Update __Revision  : $updateRevision"    -Level 'Normal' -Color White
if ($stateFilter -notin @('AllNonApproved', 'DraftOnly')) {
    Write-Log "  WARNING: stateFilter '$stateFilter' invalid — using 'AllNonApproved'." -Level 'Normal' -Color Yellow
    $stateFilter = 'AllNonApproved'
}
Write-Log "  State filter       : $stateFilter"       -Level 'Normal' -Color White
$resolvedCs = if ($connectionString -and $connectionString.Trim().Length -gt 0) {
    $connectionString.Trim()
}
else {
    Get-SqlConnectionString -DatabaseName $targetDatabase
}
foreach ($extra in @('Connect Timeout', 'Application Name', 'MultipleActiveResultSets')) {
    if ($resolvedCs -notmatch $extra) {
        $resolvedCs += switch ($extra) {
            'Connect Timeout' { ";Connect Timeout=$sqlTimeout" }
            'Application Name' { ';Application Name=WorkflowApprove' }
            'MultipleActiveResultSets' { ';MultipleActiveResultSets=False' }
        }
    }
}
$script:sqlConn = New-Object -TypeName System.Data.SqlClient.SqlConnection -ArgumentList $resolvedCs
$script:sqlConn.Open()
Invoke-SqlStatement -Query 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;'
$dbName = if ($resolvedCs -match 'Initial Catalog=([^;]+)') { $Matches[1] }
elseif ($resolvedCs -match 'Database=([^;]+)') { $Matches[1] }
else { $targetDatabase }
Write-Log "  Connected to: $dbName" -Level 'Normal' -Color Green
try {
    Resolve-ParentScope -ParentId $parentScopeId
    Write-Log "  Scope: $($script:scopeLabel)" -Level 'Normal' -Color White

    $hasMappings = Build-StateMappingTable
    if (-not $hasMappings) { exit 0 }

    $totalToApprove = Get-NotApprovedCount
    $sectionTitle = if ($stateFilter -eq 'DraftOnly') { 'Draft versions detected' } else { 'Non-approved versions detected' }
    $checkLabel   = if ($stateFilter -eq 'DraftOnly') { 'Draft versions to approve:' } else { 'Versions to approve:' }
    Write-Section $sectionTitle -Color Yellow
    Write-Check $checkLabel $totalToApprove ($totalToApprove -gt 0)

    if ($totalToApprove -eq 0) {
        Write-Log '  All matching versions already approved.' -Level 'Normal' -Color Green
    }
    elseif ($dryRun) {
        $cap = $dryRunListCap
        if ($cap -gt 2147483647) { $cap = 2147483647 }
        $rows = Get-NotApprovedRows -Top $cap
        Write-Log "  Versions that would be approved (showing max $cap):" -Level 'Normal' -Color Yellow
        foreach ($r in $rows) {
            Write-Log ("    {0}  {1,-40} [{2}] v{3}  {4}/{5}  current: {6}" -f `
                    $r['ItemId'], $r['ItemName'], $r['Language'], $r['Version'],
                    $r['WorkflowLabel'], $r['StateLabel'], $r['CurrentState']) `
                -Level 'Normal' -Color Red
        }
        if ($totalToApprove -gt $cap) {
            Write-Log "  ... and $($totalToApprove - $cap) more." -Level 'Normal' -Color Yellow
        }
        Write-Log '' -Level 'Normal'
        Write-Log "  Set `$dryRun = `$false and re-run to apply changes." -Level 'Normal' -Color Cyan
    }
    else {
        if ($updateRevision) { Initialize-ModifiedItemsTracking }

        $fixed = Set-WorkflowStateToApproved
        $revCount = 0
        if ($updateRevision) { $revCount = Finalize-RevisionUpdates }
        Cleanup-Tracking

        Write-Log '' -Level 'Normal'
        Write-Log ('=' * 78) -Level 'Normal' -Color Green
        $revMsg = if ($updateRevision) { "$($revCount.ToString('N0')) __Revision row(s) updated" } else { "__Revision update skipped" }
        Write-Log "  DONE: $($fixed.ToString('N0')) version(s) approved, $revMsg" `
            -Level 'Normal' -Color Green
        Write-Log ('=' * 78) -Level 'Normal' -Color Green
    }
}
finally {
    if ($script:scopeTempTable) {
        try { Invoke-SqlStatement -Query "IF OBJECT_ID('tempdb..#ScopeItems') IS NOT NULL DROP TABLE #ScopeItems" } catch { }
    }
    try { Invoke-SqlStatement -Query "IF OBJECT_ID('tempdb..#TemplateApprovedState') IS NOT NULL DROP TABLE #TemplateApprovedState" } catch { }
    try { Invoke-SqlStatement -Query "IF OBJECT_ID('tempdb..#StateMapping') IS NOT NULL DROP TABLE #StateMapping" } catch { }
    Cleanup-Tracking
    try { $script:sqlConn.Close(); $script:sqlConn.Dispose() } catch { }
    Write-Log "  Completed in $(((Get-Date) - $startTime).ToString('hh\:mm\:ss'))" -Level 'Quiet' -Color Gray
}
