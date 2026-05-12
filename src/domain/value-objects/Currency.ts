import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';

export class Currency {
  private constructor(private readonly _code: string) {}

  static create(code: string): Result<Currency, OrderError> {
    if (!code || typeof code !== 'string') {
      return fail({ kind: 'INVALID_CURRENCY', message: 'Currency code must be a non-empty string' });
    }
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      return fail({
        kind: 'INVALID_CURRENCY',
        message: `Currency code must be a 3-letter ISO 4217 code, got: "${code}"`,
      });
    }
    return ok(new Currency(normalized));
  }

  get value(): string { return this._code; }

  equals(other: Currency): boolean { return this._code === other._code; }

  toString(): string { return this._code; }
}
