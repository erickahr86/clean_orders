import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';

export class ProductId {
  private constructor(private readonly _value: string) {}

  static create(value: string): Result<ProductId, OrderError> {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return fail({ kind: 'INVALID_PRODUCT_ID', message: 'ProductId must be a non-empty string' });
    }
    return ok(new ProductId(value.trim()));
  }

  get value(): string { return this._value; }

  equals(other: ProductId): boolean { return this._value === other._value; }

  toString(): string { return this._value; }
}
