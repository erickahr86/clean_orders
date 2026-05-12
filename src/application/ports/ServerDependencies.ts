import type { CreateOrder } from '../use-cases/CreateOrder.js';
import type { AddItemToOrder } from '../use-cases/AddItemToOrder.js';

export interface ServerDependencies {
  createOrderUseCase:    CreateOrder;
  addItemToOrderUseCase: AddItemToOrder;
}
