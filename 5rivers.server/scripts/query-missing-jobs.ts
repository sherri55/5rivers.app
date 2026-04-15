import path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const ids = [
  'e517739d-0d75-4871-bca7-80a03d0b4dd1',
  '39ebca1f-fc56-4fa7-8295-2950490b8822',
  '3efa1a7e-44cd-45e0-84d3-eb360ea3023d',
  '50b034d7-f8fd-4abe-a952-33360998c33c',
  '91718d2a-20a4-4d8c-b76a-00403354e213',
  'ec1970b3-a6f0-4d0c-8bba-5793615cab78',
  '02028ae7-40bd-4e87-b0c9-40966aebb71d',
  'ead4f13a-c36e-4eb7-ae80-0f777f44ad65',
  '6786415b-9fc3-4133-b9c0-10f230ff06ad',
  '3260cd95-686d-4360-917f-bba6e9a75f33',
];

async function main() {
  await sql.connect(process.env.DATABASE_URL!);

  const inList = ids.map(id => `'${id}'`).join(',');
  const rows = await new sql.Request().query<any>(`
    SELECT
      j.id,
      CAST(j.jobDate AS VARCHAR(10)) AS jobDate,
      j.ticketIds,
      j.amount,
      j.startTime,
      j.endTime,
      j.sourceType,
      ji.invoiceId,
      jdp.amount AS driverPay
    FROM Jobs j
    LEFT JOIN JobInvoice ji  ON ji.jobId = j.id
    LEFT JOIN JobDriverPay jdp ON jdp.jobId = j.id
    WHERE j.id IN (${inList})
    ORDER BY j.jobDate
  `);

  console.log('\nJobs with missing amounts:\n');
  console.log('Date       | JobID (short) | Tickets         | Invoice      | Hours | DriverPay | Amount');
  console.log('-----------|---------------|-----------------|--------------|-------|-----------|-------');
  for (const r of rows.recordset) {
    console.log(
      `${r.jobDate} | ${r.id.substring(0, 8)}      | ${String(r.ticketIds ?? '—').padEnd(15)} | ${String(r.invoiceId ?? '—').padEnd(12)} | ${String(r.startTime ?? '—').padEnd(5)}-${String(r.endTime ?? '—').padEnd(5)} | ${String(r.driverPay ?? '—').padEnd(9)} | ${r.amount ?? 'NULL'}`
    );
  }

  await (sql as any).close();
}

main().catch(e => { console.error(e); process.exit(1); });
