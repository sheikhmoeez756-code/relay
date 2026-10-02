import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';

if (process.env.NODE_ENV === 'production')
  throw new Error('Local database helper is for development only.');
const databaseDir = path.resolve('.local/postgres');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'relay',
  password: 'relay_dev_password',
  port: 5432,
  persistent: true,
  authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8'],
  postgresFlags: ['-h', '127.0.0.1'],
});
async function main() {
  if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'relay'");
  if (!result.rowCount)
    await client.query("CREATE DATABASE relay ENCODING 'UTF8' TEMPLATE template0");
  await client.end();
  console.log('Development PostgreSQL ready at 127.0.0.1:5432. Data persists in .local/postgres.');
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
