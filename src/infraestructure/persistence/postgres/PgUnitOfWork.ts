import type { Pool } from 'pg';
import { infraError } from '../../../application/errors.js';
import { fail } from '../../../shared/Result.js';
import type { Result } from '../../../shared/Result.js';
import type { AppError } from '../../../application/errors.js';
import type { OrderRepository } from '../../../application/ports/OrderRepository.js';
import type { EventBus } from '../../../application/ports/EventBus.js';
import { PostgresOrderRepository } from './PostgresOrderRepository.js';
import { MessagingFactory } from '../../messaging/MessagingFactory.js';

// All repos and buses are bound to the same PoolClient for the duration of one transaction,
// so order saves and outbox inserts are always atomic.
export interface UoWRepos {
  orders: OrderRepository;
  eventBus: EventBus;
}

export class PgUnitOfWork {
  constructor(private readonly pool: Pool) {}

  // Runs `work` inside a single DB transaction.
  //
  // - If `work` returns a successful Result  → COMMIT.
  // - If `work` returns a failure Result     → ROLLBACK (business rule rejected the operation).
  // - If `work` throws                       → ROLLBACK + wraps the error as InfraError.
  //
  // The PoolClient is never exposed to `work`; only typed repo handles are.
  async run<T>(
    work: (repos: UoWRepos) => Promise<Result<T, AppError>>,
  ): Promise<Result<T, AppError>> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const repos: UoWRepos = {
        orders: new PostgresOrderRepository(client),
        eventBus: MessagingFactory.forTransaction(client),
      };

      const result = await work(repos);

      if (result.isFailure) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }

      return result;
    } catch (cause) {
      await client.query('ROLLBACK');
      return fail(infraError(cause));
    } finally {
      client.release();
    }
  }
}
