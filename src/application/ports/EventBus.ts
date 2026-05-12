import { OrderDomainEvent } from '../../domain/events/OrderDomainEvent.js';
import { Result } from '../../shared/Result.js';
import { AppError } from '../errors.js';

export interface EventBus {
  publish(events: ReadonlyArray<OrderDomainEvent>): Promise<Result<void, AppError>>;
}
