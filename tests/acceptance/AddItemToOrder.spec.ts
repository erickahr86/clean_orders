import { describe, it, expect, beforeEach } from 'vitest';
import { AddItemToOrder } from '../../src/application/use-cases/AddItemToOrder';
import { Order } from '../../src/domain/entities/Order';
import { CustomerId } from '../../src/domain/value-objects/CustomerId';
import { OrderId } from '../../src/domain/value-objects/OrderId';
import { InMemoryOrderRepository } from '../../src/infraestructure/persistence/in-memory/InMemoryOrderRepository';
import { StaticPricingService } from '../../src/infraestructure/http/StaticPricingService';
import { NoopEventBus } from '../../src/infraestructure/messaging/NoopEventBus';
import type { Result } from '../../src/shared/Result';

function unwrap<T>(r: Result<T, unknown>): T {
  if (r.isFailure) throw new Error(`Unexpected failure: ${JSON.stringify(r.error)}`);
  return r.value;
}

function unwrapError<E>(r: Result<unknown, E>): E {
  if (r.isSuccess) throw new Error('Expected failure but got success');
  return r.error;
}

const EXISTING_ORDER_ID  = 'order-acc-001';
const EXISTING_CUSTOMER  = 'customer-001';

describe('AddItemToOrder — acceptance', () => {
  let repository:     InMemoryOrderRepository;
  let pricingService: StaticPricingService;
  let eventBus:       NoopEventBus;
  let useCase:        AddItemToOrder;

  beforeEach(async () => {
    repository     = new InMemoryOrderRepository();
    pricingService = new StaticPricingService();
    eventBus       = new NoopEventBus();
    useCase        = new AddItemToOrder(repository, pricingService, eventBus);

    const order = Order.create(
      unwrap(OrderId.create(EXISTING_ORDER_ID)),
      unwrap(CustomerId.create(EXISTING_CUSTOMER)),
    );
    await repository.save(order);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('adds a single Apple product and persists the item', async () => {
    const result = await useCase.execute({
      orderId:   EXISTING_ORDER_ID,
      productId: 'magic-mouse',
      quantity:  1,
    });

    expect(result.isSuccess).toBe(true);

    const order = unwrap(await repository.findById(unwrap(OrderId.create(EXISTING_ORDER_ID))));
    expect(order).not.toBeNull();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].productId.value).toBe('magic-mouse');
    expect(order!.items[0].quantity.value).toBe(1);
    expect(order!.items[0].unitPrice.amount).toBe(79);
    expect(order!.items[0].unitPrice.currency.value).toBe('USD');
  });

  it('adds multiple distinct products and accumulates them', async () => {
    await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse',       quantity: 1 });
    await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'airpods-pro-2',     quantity: 2 });

    const order = unwrap(await repository.findById(unwrap(OrderId.create(EXISTING_ORDER_ID))));
    expect(order!.items).toHaveLength(2);
  });

  it('computes the correct subtotal after adding items', async () => {
    // magic-mouse: $79 × 2 = $158
    await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse', quantity: 2 });

    const order = unwrap(await repository.findById(unwrap(OrderId.create(EXISTING_ORDER_ID))));
    expect(order!.items[0].subtotal().amount).toBe(158);
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  it('returns VALIDATION_ERROR for an empty orderId', async () => {
    const result = await useCase.execute({ orderId: '', productId: 'magic-mouse', quantity: 1 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'VALIDATION_ERROR', field: 'orderId' });
  });

  it('returns VALIDATION_ERROR for an empty productId', async () => {
    const result = await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: '', quantity: 1 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'VALIDATION_ERROR', field: 'productId' });
  });

  it('returns VALIDATION_ERROR for quantity zero', async () => {
    const result = await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse', quantity: 0 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'VALIDATION_ERROR', field: 'quantity' });
  });

  it('returns VALIDATION_ERROR for a negative quantity', async () => {
    const result = await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse', quantity: -3 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'VALIDATION_ERROR', field: 'quantity' });
  });

  it('returns VALIDATION_ERROR for a non-integer quantity', async () => {
    const result = await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse', quantity: 1.5 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'VALIDATION_ERROR', field: 'quantity' });
  });

  // ── Not found errors ────────────────────────────────────────────────────────

  it('returns NOT_FOUND_ERROR when the order does not exist', async () => {
    const result = await useCase.execute({ orderId: 'ghost-order', productId: 'magic-mouse', quantity: 1 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'NOT_FOUND_ERROR', resource: 'Order', id: 'ghost-order' });
  });

  it('returns NOT_FOUND_ERROR for a product not in the pricing catalogue', async () => {
    const result = await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'unknown-product-xyz', quantity: 1 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'NOT_FOUND_ERROR', resource: 'Product' });
  });

  // ── Conflict errors ─────────────────────────────────────────────────────────

  it('returns CONFLICT_ERROR when the same product is added twice', async () => {
    await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse', quantity: 1 });
    const result = await useCase.execute({ orderId: EXISTING_ORDER_ID, productId: 'magic-mouse', quantity: 1 });
    expect(result.isFailure).toBe(true);
    expect(unwrapError(result)).toMatchObject({ kind: 'CONFLICT_ERROR' });
  });
});
