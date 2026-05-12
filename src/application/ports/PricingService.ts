import { Money } from '../../domain/value-objects/Money.js';
import { ProductId } from '../../domain/value-objects/ProductId.js';
import { Result } from '../../shared/Result.js';
import { AppError } from '../errors.js';

export interface PricingService {
  getUnitPrice(productId: ProductId): Promise<Result<Money, AppError>>;
}
