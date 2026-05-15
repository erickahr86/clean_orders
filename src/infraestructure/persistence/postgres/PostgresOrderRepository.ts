import { randomUUID } from 'node:crypto';
import type { QueryResult, QueryResultRow } from 'pg';
import { Order, OrderStatus } from '../../../domain/entities/Order.js';
import { OrderItem } from '../../../domain/entities/OrderItem.js';
import { CustomerId } from '../../../domain/value-objects/CustomerId.js';
import { Currency } from '../../../domain/value-objects/Currency.js';
import { Money } from '../../../domain/value-objects/Money.js';
import { OrderId } from '../../../domain/value-objects/OrderId.js';
import { ProductId } from '../../../domain/value-objects/ProductId.js';
import { Quantity } from '../../../domain/value-objects/Quantity.js';
import { infraError } from '../../../application/errors.js';
import { ok, fail } from '../../../shared/Result.js';
import type { Result } from '../../../shared/Result.js';
import type { AppError } from '../../../application/errors.js';
import type { OrderRepository } from '../../../application/ports/OrderRepository.js';

// Minimal interface satisfied by both Pool and PoolClient — lets the repo
// work standalone (Pool) or inside a UoW transaction (PoolClient).
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
}

interface OrderRow {
  id: string;
  customer_id: string;
  status: OrderStatus;
  created_at: Date;
  item_id: string | null;
  product_id: string | null;
  quantity: string | null;
  unit_price_amount: string | null;
  unit_price_currency: string | null;
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: Queryable) {}

  async findById(id: OrderId): Promise<Result<Order | null, AppError>> {
    try {
      const { rows } = await this.db.query<OrderRow>(
        `SELECT
           o.id, o.customer_id, o.status, o.created_at,
           i.id               AS item_id,
           i.product_id,
           i.quantity,
           i.unit_price_amount,
           i.unit_price_currency
         FROM orders o
         LEFT JOIN order_items i ON i.order_id = o.id
         WHERE o.id = $1`,
        [id.value],
      );

      if (rows.length === 0) return ok(null);

      return ok(this.toEntity(rows));
    } catch (cause) {
      return fail(infraError(cause));
    }
  }

  // No BEGIN/COMMIT here — transaction ownership belongs to the caller (PgUnitOfWork).
  async save(order: Order): Promise<Result<void, AppError>> {
    try {
      await this.db.query(
        `INSERT INTO orders (id, customer_id, status, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
           SET status = EXCLUDED.status`,
        [order.id.value, order.customerId.value, order.status, order.createdAt],
      );

      await this.db.query(
        'DELETE FROM order_items WHERE order_id = $1',
        [order.id.value],
      );

      for (const item of order.items) {
        await this.db.query(
          `INSERT INTO order_items
             (id, order_id, product_id, quantity, unit_price_amount, unit_price_currency)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            randomUUID(),
            order.id.value,
            item.productId.value,
            item.quantity.value,
            item.unitPrice.amount,
            item.unitPrice.currency.value,
          ],
        );
      }

      return ok(undefined);
    } catch (cause) {
      return fail(infraError(cause));
    }
  }

  private toEntity(rows: OrderRow[]): Order {
    const first = rows[0];

    const orderId    = unwrap(OrderId.create(first.id),            'OrderId');
    const customerId = unwrap(CustomerId.create(first.customer_id), 'CustomerId');

    const items: OrderItem[] = rows
      .filter((r): r is OrderRow & { item_id: string } => r.item_id !== null)
      .map(r => {
        const productId = unwrap(ProductId.create(r.product_id!),                     'ProductId');
        const quantity  = unwrap(Quantity.create(Number(r.quantity)),                  'Quantity');
        const currency  = unwrap(Currency.create(r.unit_price_currency!),              'Currency');
        const money     = unwrap(Money.create(parseFloat(r.unit_price_amount!), currency), 'Money');
        return OrderItem.create(productId, quantity, money);
      });

    return Order.reconstruct(orderId, customerId, first.created_at, first.status, items);
  }
}

function unwrap<T, E extends { message: string }>(result: Result<T, E>, label: string): T {
  if (result.isFailure) {
    throw new Error(`Invariant violation reconstructing ${label} from DB: ${result.error.message}`);
  }
  return result.value;
}
