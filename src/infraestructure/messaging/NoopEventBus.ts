import type { EventBus } from '../../application/ports/EventBus.js';
import type { AppError } from '../../application/errors.js';
import type { OrderDomainEvent } from '../../domain/events/OrderDomainEvent.js';
import { ok } from '../../shared/Result.js';
import type { Result } from '../../shared/Result.js';

export class NoopEventBus implements EventBus {
  async publish(_events: ReadonlyArray<OrderDomainEvent>): Promise<Result<void, AppError>> {
    return ok(undefined);
  }
}
