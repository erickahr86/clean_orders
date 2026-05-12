import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';

export class OrderId {
  private constructor(private readonly _value: string) {}

  static create(value: string): Result<OrderId, OrderError> {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return fail({ kind: 'INVALID_ORDER_ID', message: 'OrderId must be a non-empty string' });
    }
    return ok(new OrderId(value.trim()));
  }

  get value(): string { return this._value; }

  equals(other: OrderId): boolean { return this._value === other._value; }

  toString(): string { return this._value; }
}
