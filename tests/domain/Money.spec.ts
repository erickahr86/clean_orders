import { describe, it, expect } from 'vitest';
import { Currency } from '../../src/domain/value-objects/Currency';
import { Money } from '../../src/domain/value-objects/Money';
import type { Result } from '../../src/shared/Result';

function unwrap<T>(r: Result<T, unknown>): T {
  if (r.isFailure) throw new Error(`Unexpected failure: ${JSON.stringify(r.error)}`);
  return r.value;
}

function unwrapError<E>(r: Result<unknown, E>): E {
  if (r.isSuccess) throw new Error('Expected failure but got success');
  return r.error;
}

const USD = unwrap(Currency.create('USD'));
const EUR = unwrap(Currency.create('EUR'));

describe('Money', () => {
  describe('create', () => {
    it('creates a valid money value', () => {
      const result = Money.create(10.99, USD);
      expect(result.isSuccess).toBe(true);
      expect(unwrap(result).amount).toBe(10.99);
      expect(unwrap(result).currency.value).toBe('USD');
    });

    it('accepts zero', () => {
      expect(unwrap(Money.create(0, USD)).amount).toBe(0);
    });

    it('rejects a negative amount', () => {
      const result = Money.create(-1, USD);
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'INVALID_AMOUNT' });
    });

    it('rejects NaN', () => {
      const result = Money.create(NaN, USD);
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'INVALID_AMOUNT' });
    });

    it('rejects Infinity', () => {
      const result = Money.create(Infinity, USD);
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'INVALID_AMOUNT' });
    });
  });

  describe('zero', () => {
    it('produces amount 0 with the given currency', () => {
      const m = Money.zero(USD);
      expect(m.amount).toBe(0);
      expect(m.currency.value).toBe('USD');
    });
  });

  describe('add', () => {
    it('sums two amounts of the same currency', () => {
      const a = unwrap(Money.create(10, USD));
      const b = unwrap(Money.create(5.50, USD));
      expect(unwrap(a.add(b)).amount).toBe(15.50);
    });

    it('preserves currency after addition', () => {
      const a = unwrap(Money.create(1, USD));
      const b = unwrap(Money.create(2, USD));
      expect(unwrap(a.add(b)).currency.value).toBe('USD');
    });

    it('fails when currencies differ', () => {
      const a = unwrap(Money.create(10, USD));
      const b = unwrap(Money.create(10, EUR));
      const result = a.add(b);
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'CURRENCY_MISMATCH' });
    });
  });

  describe('multiply', () => {
    it('scales the amount by a positive integer factor', () => {
      const m = unwrap(Money.create(20, USD));
      expect(unwrap(m.multiply(3)).amount).toBe(60);
    });

    it('scales by a decimal factor', () => {
      const m = unwrap(Money.create(10, USD));
      expect(unwrap(m.multiply(1.5)).amount).toBe(15);
    });

    it('returns zero when factor is 0', () => {
      const m = unwrap(Money.create(20, USD));
      expect(unwrap(m.multiply(0)).amount).toBe(0);
    });

    it('rejects a negative factor', () => {
      const result = unwrap(Money.create(20, USD)).multiply(-1);
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'INVALID_AMOUNT' });
    });

    it('rejects a NaN factor', () => {
      expect(unwrap(Money.create(20, USD)).multiply(NaN).isFailure).toBe(true);
    });
  });

  describe('equals', () => {
    it('returns true for the same amount and currency', () => {
      const a = unwrap(Money.create(10, USD));
      const b = unwrap(Money.create(10, USD));
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for a different amount', () => {
      const a = unwrap(Money.create(10, USD));
      const b = unwrap(Money.create(20, USD));
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for a different currency', () => {
      const a = unwrap(Money.create(10, USD));
      const b = unwrap(Money.create(10, EUR));
      expect(a.equals(b)).toBe(false);
    });
  });
});
