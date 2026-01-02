/**
 * subunit-money - A type-safe value object for monetary amounts
 *
 * @example
 * import { Money, ExchangeRateService, MoneyConverter } from '@cbrunnkvist/subunit-money'
 *
 * // Basic usage
 * const price = new Money('USD', '19.99')
 * const tax = price.multiply(0.08)
 * const total = price.add(tax)
 *
 * // Currency conversion
 * const rates = new ExchangeRateService()
 * rates.setRate('USD', 'EUR', 0.92)
 * const converter = new MoneyConverter(rates)
 * const euros = converter.convert(total, 'EUR')
 */

// Core classes
export { Money, type MoneyObject } from './money.js'
export { ExchangeRateService, type ExchangeRate, type RatePair } from './exchange-rate-service.js'
export { MoneyConverter } from './money-converter.js'

// Error types
export {
  CurrencyMismatchError,
  CurrencyUnknownError,
  SubunitError,
  AmountError,
  ExchangeRateError,
} from './errors.js'

// Currency utilities
export {
  registerCurrency,
  getCurrency,
  hasCurrency,
  getAllCurrencies,
  loadCurrencyMap,
  clearCurrencies,
  type CurrencyDefinition,
} from './currency.js'

// Auto-load default currencies
import { loadCurrencyMap } from './currency.js'
import currencyMap from '../currencymap.json'
loadCurrencyMap(currencyMap as Record<string, { decimal_digits: number }>)
