import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';
import { Currency } from './Currency.js';

function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: Currency,
  ) {}

  static create(amount: number, currency: Currency): Result<Money, OrderError> {
    if (!Number.isFinite(amount)) {
      return fail({ kind: 'INVALID_AMOUNT', message: 'Amount must be a finite number' });
    }
    if (amount < 0) {
      return fail({ kind: 'INVALID_AMOUNT', message: 'Amount cannot be negative' });
    }
    return ok(new Money(toCents(amount), currency));
  }

  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  add(other: Money): Result<Money, OrderError> {
    if (!this._currency.equals(other._currency)) {
      return fail({
        kind: 'CURRENCY_MISMATCH',
        message: `Cannot add ${this._currency.value} and ${other._currency.value}`,
      });
    }
    return ok(new Money(toCents(this._amount + other._amount), this._currency));
  }

  multiply(factor: number): Result<Money, OrderError> {
    if (!Number.isFinite(factor) || factor < 0) {
      return fail({
        kind: 'INVALID_AMOUNT',
        message: 'Multiplication factor must be a non-negative finite number',
      });
    }
    return ok(new Money(toCents(this._amount * factor), this._currency));
  }

  get amount(): number { return this._amount; }
  get currency(): Currency { return this._currency; }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency.equals(other._currency);
  }

  toString(): string { return `${this._amount} ${this._currency.value}`; }
}
