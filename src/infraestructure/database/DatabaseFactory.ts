import { Pool } from 'pg';
import { getDatabaseUrl } from '../../composition/config.js';

export class DatabaseFactory {
  static createPool(): Pool {
    return new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  static async testConnection(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }
}
