export interface AddItemToOrderDto {
  readonly orderId: string;
  readonly productId: string;
  readonly quantity: number;
}
