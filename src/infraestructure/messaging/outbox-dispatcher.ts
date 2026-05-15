import { Pool } from 'pg';
import { config, getDatabaseUrl } from '../../composition/config.js';

const BATCH_SIZE = 50;

interface OutboxRow {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: unknown;
  occurred_on: Date;
}

async function dispatchBatch(pool: Pool): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<OutboxRow>(
      `SELECT id, aggregate_id, event_type, payload, occurred_on
       FROM outbox
       WHERE published_at IS NULL
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE],
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return 0;
    }

    // ── Publish to external broker here ──────────────────────────────────────
    // Replace this loop with your actual broker call (Kafka, RabbitMQ, etc.).
    // Only mark published_at AFTER a successful broker acknowledgement.
    for (const row of rows) {
      console.log(`[outbox] ${row.event_type} | aggregate=${row.aggregate_id} | id=${row.id}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const ids = rows.map(r => r.id);
    await client.query(
      'UPDATE outbox SET published_at = NOW() WHERE id = ANY($1)',
      [ids],
    );

    await client.query('COMMIT');
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });

  let running = true;

  const shutdown = () => {
    console.log('[outbox] shutting down…');
    running = false;
    pool.end().then(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log(`[outbox] worker started — interval ${config.OUTBOX_WORKER_INTERVAL}ms`);

  while (running) {
    try {
      const dispatched = await dispatchBatch(pool);
      if (dispatched > 0) {
        console.log(`[outbox] dispatched ${dispatched} event(s)`);
      }
    } catch (err) {
      console.error('[outbox] dispatch error (will retry):', err);
    }

    await new Promise<void>(res => setTimeout(res, config.OUTBOX_WORKER_INTERVAL));
  }
}

main().catch(err => {
  console.error('[outbox] fatal:', err);
  process.exit(1);
});
