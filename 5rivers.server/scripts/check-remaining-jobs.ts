import path from 'path'; import dotenv from 'dotenv'; import sql from 'mssql';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  await sql.connect(process.env.DATABASE_URL!);
  const r = await new sql.Request().query<any>(`
    SELECT j.id, CAST(j.jobDate AS VARCHAR(10)) AS jobDate,
           j.startTime, j.endTime, j.loads, j.weight, j.sourceType, j.amount,
           jt.title AS jobTypeName, jt.dispatchType, jt.rateOfJob,
           d.name AS driverName
    FROM Jobs j
    LEFT JOIN JobTypes jt ON jt.id = j.jobTypeId
    LEFT JOIN Drivers d ON d.id = j.driverId
    WHERE j.id IN ('6786415b-9fc3-4133-b9c0-10f230ff06ad','3260cd95-686d-4360-917f-bba6e9a75f33')
  `);
  r.recordset.forEach(x => console.log(JSON.stringify(x, null, 2)));
  await (sql as any).close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
