import { Order } from '../../../domain/entities/Order.js';
import { OrderId } from '../../../domain/value-objects/OrderId.js';
import { ok } from '../../../shared/Result.js';
import type { Result } from '../../../shared/Result.js';
import type { AppError } from '../../../application/errors.js';
import type { OrderRepository } from '../../../application/ports/OrderRepository.js';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<string, Order>();

  async findById(id: OrderId): Promise<Result<Order | null, AppError>> {
    return ok(this.store.get(id.value) ?? null);
  }

  async save(order: Order): Promise<Result<void, AppError>> {
    this.store.set(order.id.value, order);
    return ok(undefined);
  }
}
