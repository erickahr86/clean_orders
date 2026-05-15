import { randomUUID } from 'node:crypto';
import type { Queryable } from '../persistence/postgres/PostgresOrderRepository.js';
import type { EventBus } from '../../application/ports/EventBus.js';
import type { OrderDomainEvent } from '../../domain/events/OrderDomainEvent.js';
import { infraError } from '../../application/errors.js';
import { ok, fail } from '../../shared/Result.js';
import type { Result } from '../../shared/Result.js';
import type { AppError } from '../../application/errors.js';

export class OutboxEventBus implements EventBus {
  constructor(private readonly db: Queryable) {}

  async publish(events: ReadonlyArray<OrderDomainEvent>): Promise<Result<void, AppError>> {
    if (events.length === 0) return ok(undefined);

    try {
      for (const event of events) {
        await this.db.query(
          `INSERT INTO outbox (id, aggregate_id, event_type, payload, occurred_on)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            randomUUID(),
            event.orderId,
            event.kind,
            JSON.stringify(event),
            event.occurredOn,
          ],
        );
      }
      return ok(undefined);
    } catch (cause) {
      return fail(infraError(cause));
    }
  }
}
