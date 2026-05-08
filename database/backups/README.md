# Database Backups

Text-based SQL Server snapshots of the `5rivers` database, suitable for source control.

## Files

| File | What it is |
|---|---|
| `latest.sql` | Always the most recent snapshot. Diff-friendly anchor for `git diff` between commits. |
| `5rivers-YYYYMMDD-HHMMSS.sql` | Timestamped archive snapshots. One per backup run. |

Both files contain CREATE statements + `INSERT` rows. They can be replayed against an empty database via `sqlcmd -i latest.sql` to restore.

## Taking a backup

From the repo root, in PowerShell:

```powershell
.\backup-db.ps1                 # schema + data, timestamped + latest.sql
.\backup-db.ps1 -SchemaOnly     # schema only (small, useful for migrations)
.\backup-db.ps1 -NoTimestamp    # overwrite latest.sql only, no archive copy
.\backup-db.ps1 -Commit         # auto git add + commit the new files
```

The script reads `DATABASE_URL` from `5rivers.server\.env`, so no parameters
needed for the default case. It uses the SQL Server SMO API via the
`SqlServer` PowerShell module — installs it on first run if missing.

## Why text and not `.bak`

- **Diffable** — `git log` and PR review actually show schema/data changes.
- **Portable** — replay on any SQL Server version, no `.bak` compatibility friction.
- **Smaller in git** — incremental commits store only the deltas.
- **Reviewable** — humans can read what changed.

The trade-off is restore speed: a 1 GB DB takes longer to replay than to
restore from `.bak`. For development backups that's fine; for production
disaster recovery, take native `.bak` files separately.

## Restoring

```powershell
sqlcmd -S DHILLON-ALIEN -U sa -P 'YOUR_PASSWORD' -d 5rivers -i database\backups\latest.sql
```

(Use the same server / database / credentials as in `5rivers.server\.env`.)
