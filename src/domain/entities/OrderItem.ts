import { Money } from '../value-objects/Money.js';
import { ProductId } from '../value-objects/ProductId.js';
import { Quantity } from '../value-objects/Quantity.js';

export class OrderItem {
  private constructor(
    readonly productId: ProductId,
    readonly quantity: Quantity,
    readonly unitPrice: Money,
  ) {}

  static create(productId: ProductId, quantity: Quantity, unitPrice: Money): OrderItem {
    return new OrderItem(productId, quantity, unitPrice);
  }

  subtotal(): Money {
    const result = this.unitPrice.multiply(this.quantity.value);
    if (result.isFailure) {
      // quantity > 0 and unitPrice.amount >= 0 are invariants guaranteed by their VOs
      throw new Error(`Invariant violation computing subtotal: ${result.error.message}`);
    }
    return result.value;
  }

  sameProductAs(other: OrderItem): boolean {
    return this.productId.equals(other.productId);
  }
}
