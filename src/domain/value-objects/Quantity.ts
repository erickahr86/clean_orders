import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';

export class Quantity {
  private constructor(private readonly _value: number) {}

  static create(value: number): Result<Quantity, OrderError> {
    if (!Number.isInteger(value)) {
      return fail({ kind: 'INVALID_QUANTITY', message: 'Quantity must be an integer' });
    }
    if (value <= 0) {
      return fail({ kind: 'INVALID_QUANTITY', message: 'Quantity must be greater than zero' });
    }
    return ok(new Quantity(value));
  }

  get value(): number { return this._value; }

  equals(other: Quantity): boolean { return this._value === other._value; }

  toString(): string { return String(this._value); }
}
