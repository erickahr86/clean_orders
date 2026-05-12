import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';

export class CustomerId {
  private constructor(private readonly _value: string) {}

  static create(value: string): Result<CustomerId, OrderError> {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return fail({ kind: 'INVALID_CUSTOMER_ID', message: 'CustomerId must be a non-empty string' });
    }
    return ok(new CustomerId(value.trim()));
  }

  get value(): string { return this._value; }

  equals(other: CustomerId): boolean { return this._value === other._value; }

  toString(): string { return this._value; }
}
