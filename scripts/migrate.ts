import 'dotenv/config';
import { Client } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config, getDatabaseUrl } from '../src/composition/config.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../db/migrations');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f: string) => f.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename],
      );

      if (rowCount && rowCount > 0) {
        console.log(`  skip  ${filename}`);
        continue;
      }

      console.log(`  run   ${filename}`);
      const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('migrations complete');
  } finally {
    await client.end();
  }
}

migrate().catch(err => {
  console.error('migration failed:', err.message);
  process.exit(1);
});
