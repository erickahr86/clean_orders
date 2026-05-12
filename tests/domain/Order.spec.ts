import { describe, it, expect } from 'vitest';
import { Order } from '../../src/domain/entities/Order';
import { Currency } from '../../src/domain/value-objects/Currency';
import { CustomerId } from '../../src/domain/value-objects/CustomerId';
import { Money } from '../../src/domain/value-objects/Money';
import { OrderId } from '../../src/domain/value-objects/OrderId';
import { ProductId } from '../../src/domain/value-objects/ProductId';
import { Quantity } from '../../src/domain/value-objects/Quantity';
import type { Result } from '../../src/shared/Result';

function unwrap<T>(r: Result<T, unknown>): T {
  if (r.isFailure) throw new Error(`Unexpected failure: ${JSON.stringify(r.error)}`);
  return r.value;
}
function unwrapError<E>(r: Result<unknown, E>): E {
  if (r.isSuccess) throw new Error('Expected failure but got success');
  return r.error;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USD = unwrap(Currency.create('USD'));
const EUR = unwrap(Currency.create('EUR'));

function makeOrder(id = 'order-1', cid = 'cust-1') {
  return Order.create(
    unwrap(OrderId.create(id)),
    unwrap(CustomerId.create(cid)),
  );
}

const pid  = (v: string) => unwrap(ProductId.create(v));
const qty  = (n: number) => unwrap(Quantity.create(n));
const usd  = (amount: number) => unwrap(Money.create(amount, USD));
const eur  = (amount: number) => unwrap(Money.create(amount, EUR));

// ─────────────────────────────────────────────────────────────────────────────

describe('Order', () => {
  describe('create', () => {
    it('starts as PENDING with no items', () => {
      const order = makeOrder();
      expect(order.status).toBe('PENDING');
      expect(order.items).toHaveLength(0);
    });

    it('emits a single ORDER_CREATED event', () => {
      const order = makeOrder();
      const events = order.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ kind: 'ORDER_CREATED', orderId: 'order-1', customerId: 'cust-1' });
    });

    it('pullEvents drains the queue', () => {
      const order = makeOrder();
      order.pullEvents();
      expect(order.pullEvents()).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    it('adds an item and returns success', () => {
      const order = makeOrder();
      const result = order.addItem(pid('prod-A'), qty(2), usd(9.99));
      expect(result.isSuccess).toBe(true);
      expect(order.items).toHaveLength(1);
    });

    it('emits ORDER_ITEM_ADDED with correct payload', () => {
      const order = makeOrder();
      order.pullEvents();
      order.addItem(pid('prod-A'), qty(3), usd(5));
      const events = order.pullEvents();
      expect(events[0]).toMatchObject({
        kind: 'ORDER_ITEM_ADDED',
        productId: 'prod-A',
        quantity: 3,
        unitPrice: { amount: 5, currency: 'USD' },
      });
    });

    it('rejects a duplicate product', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(1), usd(5));
      const result = order.addItem(pid('prod-A'), qty(2), usd(5));
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'ITEM_ALREADY_EXISTS' });
    });

    it('rejects an item whose currency differs from the order currency', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(1), usd(5));
      const result = order.addItem(pid('prod-B'), qty(1), eur(5));
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'CURRENCY_MISMATCH' });
    });

    it('rejects when the order is CONFIRMED', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(1), usd(10));
      order.confirm();
      const result = order.addItem(pid('prod-B'), qty(1), usd(5));
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'CANNOT_MODIFY_CONFIRMED_ORDER' });
    });

    it('rejects when the order is CANCELLED', () => {
      const order = makeOrder();
      order.cancel('test');
      const result = order.addItem(pid('prod-A'), qty(1), usd(5));
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'CANNOT_MODIFY_CANCELLED_ORDER' });
    });
  });

  describe('total', () => {
    it('sums all item subtotals', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(2), usd(10));  // 20
      order.addItem(pid('prod-B'), qty(3), usd(5));   // 15
      expect(unwrap(order.total()).amount).toBe(35);
    });

    it('fails on an empty order', () => {
      const result = makeOrder().total();
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'ORDER_IS_EMPTY' });
    });
  });

  describe('confirm', () => {
    it('transitions to CONFIRMED', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(1), usd(10));
      expect(unwrap(order.confirm()), 'confirm should succeed').toBeUndefined();
      expect(order.status).toBe('CONFIRMED');
    });

    it('emits ORDER_CONFIRMED with the computed total', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(2), usd(10));
      order.pullEvents();
      order.confirm();
      expect(order.pullEvents()[0]).toMatchObject({
        kind: 'ORDER_CONFIRMED',
        total: { amount: 20, currency: 'USD' },
      });
    });

    it('rejects confirming an empty order', () => {
      const result = makeOrder().confirm();
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'ORDER_IS_EMPTY' });
    });

    it('rejects double-confirm', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(1), usd(10));
      order.confirm();
      const result = order.confirm();
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'ORDER_ALREADY_CONFIRMED' });
    });
  });

  describe('cancel', () => {
    it('transitions to CANCELLED', () => {
      const order = makeOrder();
      expect(unwrap(order.cancel('changed mind'))).toBeUndefined();
      expect(order.status).toBe('CANCELLED');
    });

    it('emits ORDER_CANCELLED with the reason', () => {
      const order = makeOrder();
      order.pullEvents();
      order.cancel('changed mind');
      expect(order.pullEvents()[0]).toMatchObject({ kind: 'ORDER_CANCELLED', reason: 'changed mind' });
    });

    it('rejects double-cancel', () => {
      const order = makeOrder();
      order.cancel('first');
      expect(order.cancel('second').isFailure).toBe(true);
      expect(unwrapError(order.cancel('second'))).toMatchObject({ kind: 'ORDER_ALREADY_CANCELLED' });
    });

    it('rejects cancelling a confirmed order', () => {
      const order = makeOrder();
      order.addItem(pid('prod-A'), qty(1), usd(10));
      order.confirm();
      const result = order.cancel('too late');
      expect(result.isFailure).toBe(true);
      expect(unwrapError(result)).toMatchObject({ kind: 'ORDER_ALREADY_CONFIRMED' });
    });
  });
});
