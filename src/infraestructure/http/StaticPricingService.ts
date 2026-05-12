import type { PricingService } from '../../application/ports/PricingService.js';
import { infraError, notFoundError } from '../../application/errors.js';
import type { AppError } from '../../application/errors.js';
import { Currency } from '../../domain/value-objects/Currency.js';
import { Money } from '../../domain/value-objects/Money.js';
import type { ProductId } from '../../domain/value-objects/ProductId.js';
import { ok, fail } from '../../shared/Result.js';
import type { Result } from '../../shared/Result.js';

interface PriceRecord {
  amount: number;
  currency: string;
}

// Simulates the catalogue returned by an external HTTP pricing service.
const PRICE_CATALOGUE: Record<string, PriceRecord> = {
  'iphone-16-pro-256gb':        { amount: 1199.00, currency: 'USD' },
  'iphone-16-pro-max-512gb':    { amount: 1499.00, currency: 'USD' },
  'macbook-pro-14-m4':          { amount: 1999.00, currency: 'USD' },
  'macbook-pro-16-m4-pro':      { amount: 2499.00, currency: 'USD' },
  'macbook-air-13-m3':          { amount: 1099.00, currency: 'USD' },
  'ipad-pro-13-m4':             { amount: 1299.00, currency: 'USD' },
  'ipad-air-11-m2':             { amount:  749.00, currency: 'USD' },
  'apple-watch-ultra-2':        { amount:  799.00, currency: 'USD' },
  'apple-watch-series-10-gps':  { amount:  399.00, currency: 'USD' },
  'airpods-pro-2':              { amount:  249.00, currency: 'USD' },
  'airpods-max-usbc':           { amount:  549.00, currency: 'USD' },
  'magic-mouse':                { amount:   79.00, currency: 'USD' },
  'magic-keyboard-touch-id':    { amount:   99.00, currency: 'USD' },
  'magic-trackpad':             { amount:  129.00, currency: 'USD' },
  'apple-tv-4k-wifi-128gb':     { amount:  129.00, currency: 'USD' },
  'homepod-2nd-gen':            { amount:  299.00, currency: 'USD' },
  'apple-pencil-pro':           { amount:  129.00, currency: 'USD' },
  'vision-pro-256gb':           { amount: 3499.00, currency: 'USD' },
};

export class StaticPricingService implements PricingService {
  async getUnitPrice(productId: ProductId): Promise<Result<Money, AppError>> {
    const record = PRICE_CATALOGUE[productId.value];

    if (!record) {
      return fail(notFoundError('Product', productId.value));
    }

    const currencyResult = Currency.create(record.currency);
    if (currencyResult.isFailure) {
      return fail(infraError(
        currencyResult.error,
        `Pricing catalogue contains invalid currency for product "${productId.value}"`,
      ));
    }

    const moneyResult = Money.create(record.amount, currencyResult.value);
    if (moneyResult.isFailure) {
      return fail(infraError(
        moneyResult.error,
        `Pricing catalogue contains invalid amount for product "${productId.value}"`,
      ));
    }

    return ok(moneyResult.value);
  }
}
