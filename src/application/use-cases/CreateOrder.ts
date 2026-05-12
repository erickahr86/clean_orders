import { Order } from '../../domain/entities/Order.js';
import { OrderError } from '../../domain/errors/OrderErrors.js';
import { CustomerId } from '../../domain/value-objects/CustomerId.js';
import { OrderId } from '../../domain/value-objects/OrderId.js';
import { Result, fail, ok } from '../../shared/Result.js';
import { CreateOrderDto, CreateOrderResponse } from '../dto/CreateOrderDto.js';
import {
  AppError,
  conflictError,
  validationError,
  ValidationError,
  ConflictError,
} from '../errors.js';
import { EventBus } from '../ports/EventBus.js';
import { OrderRepository } from '../ports/OrderRepository.js';

const VALIDATION_FIELD: Partial<Record<OrderError['kind'], string>> = {
  INVALID_ORDER_ID: 'orderId',
  INVALID_CUSTOMER_ID: 'customerId',
  INVALID_PRODUCT_ID: 'productId',
  INVALID_CURRENCY: 'currency',
  INVALID_AMOUNT: 'amount',
  INVALID_QUANTITY: 'quantity',
};

function mapDomainError(err: OrderError): ValidationError | ConflictError {
  const field = VALIDATION_FIELD[err.kind];
  return field ? validationError(field, err.message) : conflictError(err.message);
}

export class CreateOrder {
  constructor(
    private readonly repository: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateOrderDto): Promise<Result<CreateOrderResponse, AppError>> {
    const orderIdResult = OrderId.create(dto.orderId);
    if (orderIdResult.isFailure) return fail(mapDomainError(orderIdResult.error));

    const customerIdResult = CustomerId.create(dto.customerId);
    if (customerIdResult.isFailure) return fail(mapDomainError(customerIdResult.error));

    const orderId = orderIdResult.value;
    const customerId = customerIdResult.value;

    const existingResult = await this.repository.findById(orderId);
    if (existingResult.isFailure) return existingResult;

    if (existingResult.value !== null) {
      return fail(conflictError(`Order with id "${orderId.value}" already exists`));
    }

    const order = Order.create(orderId, customerId);

    const saveResult = await this.repository.save(order);
    if (saveResult.isFailure) return saveResult;

    const publishResult = await this.eventBus.publish(order.pullEvents());
    if (publishResult.isFailure) return publishResult;

    return ok({ orderId: orderId.value });
  }
}
