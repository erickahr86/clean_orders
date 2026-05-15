import type { Queryable } from '../persistence/postgres/PostgresOrderRepository.js';
import type { EventBus } from '../../application/ports/EventBus.js';
import { OutboxEventBus } from './OutboxEventBus.js';
import { NoopEventBus } from './NoopEventBus.js';

export class MessagingFactory {
  static forTransaction(db: Queryable): EventBus {
    return new OutboxEventBus(db);
  }

  static noop(): EventBus {
    return new NoopEventBus();
  }
}
