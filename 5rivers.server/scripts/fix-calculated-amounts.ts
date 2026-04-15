/**
 * Fix 8 jobs whose jobGrossAmount was 0/negative in Neo4j but calculatedAmount has the real value.
 * Run: npx ts-node scripts/fix-calculated-amounts.ts
 */
import path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

const fixes = [
  { id: 'e517739d-0d75-4871-bca7-80a03d0b4dd1', amount: 875.5  },
  { id: '39ebca1f-fc56-4fa7-8295-2950490b8822', amount: 700.0  },
  { id: '3efa1a7e-44cd-45e0-84d3-eb360ea3023d', amount: 969.0  },
  { id: '50b034d7-f8fd-4abe-a952-33360998c33c', amount: 612.0  },
  { id: '91718d2a-20a4-4d8c-b76a-00403354e213', amount: 285.0  },
  { id: 'ec1970b3-a6f0-4d0c-8bba-5793615cab78', amount: 525.0  },
  { id: '02028ae7-40bd-4e87-b0c9-40966aebb71d', amount: 900.0  },
  { id: 'ead4f13a-c36e-4eb7-ae80-0f777f44ad65', amount: 641.25 },
];

async function main() {
  await sql.connect(DATABASE_URL!);
  console.log('✅ Connected\n');

  for (const f of fixes) {
    const req = new sql.Request();
    req.input('amount', sql.Decimal(18, 2), f.amount);
    req.input('id', sql.NVarChar(36), f.id);
    const res = await req.query(
      `UPDATE Jobs SET amount = @amount, updatedAt = GETUTCDATE() WHERE id = @id`
    );
    console.log(`  ✔ ${f.id}  →  ${f.amount}  (rows affected: ${res.rowsAffected[0]})`);
  }

  await (sql as any).close();
  console.log('\n✅ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
