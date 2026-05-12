interface DomainEventBase {
  readonly occurredOn: Date;
}

export interface OrderCreated extends DomainEventBase {
  readonly kind: 'ORDER_CREATED';
  readonly orderId: string;
  readonly customerId: string;
}

export interface OrderItemAdded extends DomainEventBase {
  readonly kind: 'ORDER_ITEM_ADDED';
  readonly orderId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: { readonly amount: number; readonly currency: string };
}

export interface OrderConfirmed extends DomainEventBase {
  readonly kind: 'ORDER_CONFIRMED';
  readonly orderId: string;
  readonly total: { readonly amount: number; readonly currency: string };
}

export interface OrderCancelled extends DomainEventBase {
  readonly kind: 'ORDER_CANCELLED';
  readonly orderId: string;
  readonly reason: string;
}

export type OrderDomainEvent =
  | OrderCreated
  | OrderItemAdded
  | OrderConfirmed
  | OrderCancelled;
