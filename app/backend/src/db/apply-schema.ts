import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

async function main() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const pool = await sql.connect(config.databaseUrl);
  try {
    await pool.request().query(schema);
    console.log('Schema applied successfully.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
