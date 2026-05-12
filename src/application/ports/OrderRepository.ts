import { Order } from '../../domain/entities/Order.js';
import { OrderId } from '../../domain/value-objects/OrderId.js';
import { Result } from '../../shared/Result.js';
import { AppError } from '../errors.js';

export interface OrderRepository {
  findById(id: OrderId): Promise<Result<Order | null, AppError>>;
  save(order: Order): Promise<Result<void, AppError>>;
}
