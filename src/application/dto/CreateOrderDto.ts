export interface CreateOrderDto {
  readonly orderId: string;
  readonly customerId: string;
}

export interface CreateOrderResponse {
  readonly orderId: string;
}
