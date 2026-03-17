import app from './app';
import { config } from './config';
import { closePool } from './db/connection';

const server = app.listen(config.port, () => {
  console.log(`5rivers.server listening on http://localhost:${config.port}`);
});

async function shutdown() {
  await closePool();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
