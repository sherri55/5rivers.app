import express from 'express';
import { getPool } from './db/connection';
import { config } from './config';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', database: message });
  }
});

const server = app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});

async function shutdown() {
  const { closePool } = await import('./db/connection');
  await closePool();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
