import type { Result } from '../../shared/Result.js';
import type { AppError } from '../errors.js';
import type { CreateOrderDto, CreateOrderResponse } from '../dto/CreateOrderDto.js';
import type { AddItemToOrderDto } from '../dto/AddItemToOrderDto.js';
import { Logger } from '../../application/ports/Logger.js';

// Structural interfaces — any object with a matching execute() satisfies these,
// including the concrete use cases and UoW-wrapped variants.
export interface CreateOrderUseCase {
  execute(dto: CreateOrderDto): Promise<Result<CreateOrderResponse, AppError>>;
}

export interface AddItemToOrderUseCase {
  execute(dto: AddItemToOrderDto): Promise<Result<void, AppError>>;
}

export interface ServerDependencies {
  createOrderUseCase:    CreateOrderUseCase;
  addItemToOrderUseCase: AddItemToOrderUseCase;
  logger: Logger;
}
