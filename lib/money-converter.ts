/**
 * Money Converter - Safe cross-currency operations.
 *
 * Bridges Money objects with ExchangeRateService to enable:
 * - Currency conversion
 * - Multi-currency arithmetic
 * - Percentage calculations across currencies
 */

import { Money } from './money.js'
import { ExchangeRateService } from './exchange-rate-service.js'
import { ExchangeRateError } from './errors.js'
import { getCurrency } from './currency.js'

/**
 * Converter for performing operations between different currencies.
 *
 * @example
 * const rates = new ExchangeRateService()
 * rates.setRate('USD', 'EUR', 0.92)
 *
 * const converter = new MoneyConverter(rates)
 * const euros = converter.convert(new Money('USD', '100'), 'EUR')
 * console.log(euros.toString()) // "92.00 EUR"
 */
export class MoneyConverter {
  readonly #rateService: ExchangeRateService

  constructor(rateService: ExchangeRateService) {
    this.#rateService = rateService
  }

  /**
   * Convert a Money amount to another currency.
   *
   * @param money - The amount to convert
   * @param targetCurrency - The target currency code
   * @returns A new Money in the target currency
   * @throws {ExchangeRateError} If no rate is available
   */
  convert<From extends string, To extends string>(
    money: Money<From>,
    targetCurrency: To
  ): Money<To> {
    if ((money.currency as string) === (targetCurrency as string)) {
      return money as unknown as Money<To>
    }

    const rate = this.#rateService.getRate(money.currency, targetCurrency)
    if (!rate) {
      throw new ExchangeRateError(money.currency, targetCurrency)
    }

    const currencyDef = getCurrency(targetCurrency)
    const convertedAmount = Number(money.amount) * Number(rate.rate)
    const rounded = convertedAmount.toFixed(currencyDef!.decimalDigits)
    return new Money(targetCurrency, rounded)
  }

  /**
   * Add two Money amounts, converting as needed.
   *
   * @param a - First amount
   * @param b - Second amount
   * @param resultCurrency - Currency for the result (must be one of the input currencies)
   * @returns Sum in the result currency
   */
  add<A extends string, B extends string, R extends A | B>(
    a: Money<A>,
    b: Money<B>,
    resultCurrency: R
  ): Money<R> {
    const aConverted = this.convert(a, resultCurrency)
    const bConverted = this.convert(b, resultCurrency)
    return aConverted.add(bConverted) as Money<R>
  }

  /**
   * Subtract two Money amounts, converting as needed.
   *
   * @param a - Amount to subtract from
   * @param b - Amount to subtract
   * @param resultCurrency - Currency for the result
   * @returns Difference in the result currency
   */
  subtract<A extends string, B extends string, R extends A | B>(
    a: Money<A>,
    b: Money<B>,
    resultCurrency: R
  ): Money<R> {
    const aConverted = this.convert(a, resultCurrency)
    const bConverted = this.convert(b, resultCurrency)
    return aConverted.subtract(bConverted) as Money<R>
  }

  /**
   * Calculate what percentage one amount is of another.
   * Converts both to the same currency before comparison.
   *
   * @param part - The partial amount
   * @param whole - The whole amount
   * @returns Percentage as a number (e.g., 25 for 25%)
   */
  percentageOf<A extends string, B extends string>(
    part: Money<A>,
    whole: Money<B>
  ): number {
    // Convert both to the 'whole' currency for comparison
    const partConverted = this.convert(part, whole.currency)
    return (partConverted.toNumber() / whole.toNumber()) * 100
  }

  /**
   * Sum multiple Money amounts, converting all to a target currency.
   *
   * @param amounts - Array of Money objects (can be different currencies)
   * @param targetCurrency - Currency for the result
   * @returns Total in the target currency
   */
  sum<C extends string>(amounts: Money<string>[], targetCurrency: C): Money<C> {
    let total = Money.zero(targetCurrency)

    for (const amount of amounts) {
      const converted = this.convert(amount, targetCurrency)
      total = total.add(converted)
    }

    return total
  }

  /**
   * Compare two Money amounts across currencies.
   * Returns negative if a < b, zero if equal, positive if a > b.
   *
   * @param a - First amount
   * @param b - Second amount
   * @returns Comparison result
   */
  compare<A extends string, B extends string>(a: Money<A>, b: Money<B>): -1 | 0 | 1 {
    // Convert b to a's currency for comparison
    const bConverted = this.convert(b, a.currency)
    return Money.compare(a, bConverted)
  }

  /**
   * Get the exchange rate service (for direct rate access).
   */
  get rateService(): ExchangeRateService {
    return this.#rateService
  }
}
