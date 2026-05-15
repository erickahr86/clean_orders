import { Result, ok, fail } from '../../shared/Result.js';
import { OrderError } from '../errors/OrderErrors.js';
import { OrderDomainEvent } from '../events/OrderDomainEvent.js';
import { OrderItem } from './OrderItem.js';
import { CustomerId } from '../value-objects/CustomerId.js';
import { Money } from '../value-objects/Money.js';
import { OrderId } from '../value-objects/OrderId.js';
import { ProductId } from '../value-objects/ProductId.js';
import { Quantity } from '../value-objects/Quantity.js';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export class Order {
  private readonly _events: OrderDomainEvent[] = [];
  private _items: OrderItem[] = [];
  private _status: OrderStatus;

  private constructor(
    readonly id: OrderId,
    readonly customerId: CustomerId,
    readonly createdAt: Date,
    status: OrderStatus,
    items: OrderItem[],
  ) {
    this._status = status;
    this._items = [...items];
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  static create(id: OrderId, customerId: CustomerId): Order {
    const order = new Order(id, customerId, new Date(), 'PENDING', []);
    order._events.push({
      kind: 'ORDER_CREATED',
      orderId: id.value,
      customerId: customerId.value,
      occurredOn: new Date(),
    });
    return order;
  }

  static reconstruct(
    id: OrderId,
    customerId: CustomerId,
    createdAt: Date,
    status: OrderStatus,
    items: OrderItem[],
  ): Order {
    return new Order(id, customerId, createdAt, status, items);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  get status(): OrderStatus { return this._status; }
  get items(): ReadonlyArray<OrderItem> { return [...this._items]; }

  total(): Result<Money, OrderError> {
    if (this._items.length === 0) {
      return fail({ kind: 'ORDER_IS_EMPTY', message: 'Cannot calculate total of an empty order' });
    }
    // Currency consistency is enforced on addItem, so the reduce cannot fail due to mismatch.
    const [first, ...rest] = this._items;
    return rest.reduce<Result<Money, OrderError>>(
      (acc, item) => acc.isFailure ? acc : acc.value.add(item.subtotal()),
      ok(first.subtotal()),
    );
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  addItem(
    productId: ProductId,
    quantity: Quantity,
    unitPrice: Money,
  ): Result<void, OrderError> {
    if (this._status === 'CONFIRMED') {
      return fail({ kind: 'CANNOT_MODIFY_CONFIRMED_ORDER', message: 'Cannot add items to a confirmed order' });
    }
    if (this._status === 'CANCELLED') {
      return fail({ kind: 'CANNOT_MODIFY_CANCELLED_ORDER', message: 'Cannot add items to a cancelled order' });
    }

    // All items in an order share the same currency (set by the first item added).
    if (this._items.length > 0) {
      const orderCurrency = this._items[0].unitPrice.currency;
      if (!orderCurrency.equals(unitPrice.currency)) {
        return fail({
          kind: 'CURRENCY_MISMATCH',
          message: `Order currency is ${orderCurrency.value}, cannot add item priced in ${unitPrice.currency.value}`,
        });
      }
    }

    if (this._items.some(i => i.productId.equals(productId))) {
      return fail({ kind: 'ITEM_ALREADY_EXISTS', message: `Product ${productId.value} is already in the order` });
    }

    this._items.push(OrderItem.create(productId, quantity, unitPrice));
    this._events.push({
      kind: 'ORDER_ITEM_ADDED',
      orderId: this.id.value,
      productId: productId.value,
      quantity: quantity.value,
      unitPrice: { amount: unitPrice.amount, currency: unitPrice.currency.value },
      occurredOn: new Date(),
    });

    return ok(undefined);
  }

  confirm(): Result<void, OrderError> {
    if (this._status === 'CONFIRMED') {
      return fail({ kind: 'ORDER_ALREADY_CONFIRMED', message: 'Order is already confirmed' });
    }
    if (this._status === 'CANCELLED') {
      return fail({ kind: 'CANNOT_MODIFY_CANCELLED_ORDER', message: 'Cannot confirm a cancelled order' });
    }
    if (this._items.length === 0) {
      return fail({ kind: 'ORDER_IS_EMPTY', message: 'Cannot confirm an order with no items' });
    }

    this._status = 'CONFIRMED';

    const totalResult = this.total();
    if (totalResult.isFailure) throw new Error('Invariant violation: total failed on non-empty confirmed order');

    this._events.push({
      kind: 'ORDER_CONFIRMED',
      orderId: this.id.value,
      total: { amount: totalResult.value.amount, currency: totalResult.value.currency.value },
      occurredOn: new Date(),
    });

    return ok(undefined);
  }

  cancel(reason: string): Result<void, OrderError> {
    if (this._status === 'CANCELLED') {
      return fail({ kind: 'ORDER_ALREADY_CANCELLED', message: 'Order is already cancelled' });
    }
    if (this._status === 'CONFIRMED') {
      return fail({ kind: 'ORDER_ALREADY_CONFIRMED', message: 'Cannot cancel a confirmed order' });
    }

    this._status = 'CANCELLED';
    this._events.push({
      kind: 'ORDER_CANCELLED',
      orderId: this.id.value,
      reason,
      occurredOn: new Date(),
    });

    return ok(undefined);
  }

  // Drains and returns collected domain events (call once per transaction).
  pullEvents(): ReadonlyArray<OrderDomainEvent> {
    const events = [...this._events];
    this._events.splice(0);
    return events;
  }
}
