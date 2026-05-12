import { OrderError } from '../../domain/errors/OrderErrors.js';
import { OrderId } from '../../domain/value-objects/OrderId.js';
import { ProductId } from '../../domain/value-objects/ProductId.js';
import { Quantity } from '../../domain/value-objects/Quantity.js';
import { Result, fail, ok } from '../../shared/Result.js';
import { AddItemToOrderDto } from '../dto/AddItemToOrderDto.js';
import {
  AppError,
  ConflictError,
  ValidationError,
  conflictError,
  notFoundError,
  validationError,
} from '../errors.js';
import { EventBus } from '../ports/EventBus.js';
import { OrderRepository } from '../ports/OrderRepository.js';
import { PricingService } from '../ports/PricingService.js';

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

export class AddItemToOrder {
  constructor(
    private readonly repository: OrderRepository,
    private readonly pricingService: PricingService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: AddItemToOrderDto): Promise<Result<void, AppError>> {
    const orderIdResult = OrderId.create(dto.orderId);
    if (orderIdResult.isFailure) return fail(mapDomainError(orderIdResult.error));

    const productIdResult = ProductId.create(dto.productId);
    if (productIdResult.isFailure) return fail(mapDomainError(productIdResult.error));

    const quantityResult = Quantity.create(dto.quantity);
    if (quantityResult.isFailure) return fail(mapDomainError(quantityResult.error));

    const orderId = orderIdResult.value;
    const productId = productIdResult.value;
    const quantity = quantityResult.value;

    const orderResult = await this.repository.findById(orderId);
    if (orderResult.isFailure) return orderResult;

    if (orderResult.value === null) {
      return fail(notFoundError('Order', orderId.value));
    }

    const order = orderResult.value;

    const unitPriceResult = await this.pricingService.getUnitPrice(productId);
    if (unitPriceResult.isFailure) return unitPriceResult;

    const addResult = order.addItem(productId, quantity, unitPriceResult.value);
    if (addResult.isFailure) return fail(mapDomainError(addResult.error));

    const saveResult = await this.repository.save(order);
    if (saveResult.isFailure) return saveResult;

    const publishResult = await this.eventBus.publish(order.pullEvents());
    if (publishResult.isFailure) return publishResult;

    return ok(undefined);
  }
}
