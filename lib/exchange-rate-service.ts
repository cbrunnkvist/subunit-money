/**
 * Exchange Rate Service - Central authority for currency conversion rates.
 *
 * Design principles:
 * - Rates are stored as strings to preserve precision
 * - Timestamps track when rates were set
 * - Optional source tracking for audit trails
 * - Inverse rates can be auto-generated or explicitly set
 */

export interface ExchangeRate {
  from: string
  to: string
  rate: string
  timestamp: Date
  source?: string
}

export interface RatePair {
  forward: ExchangeRate
  reverse: ExchangeRate
  /** Relative discrepancy between forward and 1/reverse rates */
  discrepancy: number
}

/**
 * Service for managing exchange rates between currencies.
 *
 * @example
 * const rates = new ExchangeRateService()
 * rates.setRate('USD', 'EUR', 0.92, 'ECB')
 * rates.getRate('USD', 'EUR') // { from: 'USD', to: 'EUR', rate: '0.92', ... }
 */
export class ExchangeRateService {
  readonly #rates: Map<string, ExchangeRate> = new Map()

  /**
   * Create a rate key for storage.
   */
  #key(from: string, to: string): string {
    return `${from}:${to}`
  }

  /**
   * Set an exchange rate.
   *
   * @param from - Source currency code
   * @param to - Target currency code
   * @param rate - Exchange rate (1 unit of 'from' = rate units of 'to')
   * @param source - Optional source identifier (e.g., 'ECB', 'Coinbase')
   * @param autoInverse - If true, automatically create inverse rate (default: true)
   */
  setRate(
    from: string,
    to: string,
    rate: number | string,
    source?: string,
    autoInverse: boolean = true
  ): void {
    const rateStr = typeof rate === 'number' ? rate.toPrecision(15) : rate

    this.#rates.set(this.#key(from, to), {
      from,
      to,
      rate: rateStr,
      timestamp: new Date(),
      source,
    })

    // Auto-create inverse rate if requested and not already explicitly set
    if (autoInverse) {
      const inverseKey = this.#key(to, from)
      if (!this.#rates.has(inverseKey)) {
        const inverseRate = 1 / Number(rateStr)
        this.#rates.set(inverseKey, {
          from: to,
          to: from,
          rate: inverseRate.toPrecision(15),
          timestamp: new Date(),
          source: source ? `${source} (inverse)` : '(inverse)',
        })
      }
    }
  }

  /**
   * Get an exchange rate.
   *
   * @param from - Source currency code
   * @param to - Target currency code
   * @returns The exchange rate, or undefined if not set
   */
  getRate(from: string, to: string): ExchangeRate | undefined {
    // Same currency = rate of 1
    if (from === to) {
      return {
        from,
        to,
        rate: '1',
        timestamp: new Date(),
        source: '(identity)',
      }
    }

    return this.#rates.get(this.#key(from, to))
  }

  /**
   * Check if a rate exists.
   */
  hasRate(from: string, to: string): boolean {
    return from === to || this.#rates.has(this.#key(from, to))
  }

  /**
   * Remove a rate.
   */
  removeRate(from: string, to: string): boolean {
    return this.#rates.delete(this.#key(from, to))
  }

  /**
   * Get both forward and reverse rates, with discrepancy analysis.
   * Useful for detecting rate inconsistencies.
   *
   * @param currencyA - First currency
   * @param currencyB - Second currency
   * @returns Rate pair with discrepancy, or undefined if either rate is missing
   */
  getRatePair(currencyA: string, currencyB: string): RatePair | undefined {
    const forward = this.getRate(currencyA, currencyB)
    const reverse = this.getRate(currencyB, currencyA)

    if (!forward || !reverse) {
      return undefined
    }

    // Calculate discrepancy: how far is forward * reverse from 1.0?
    const product = Number(forward.rate) * Number(reverse.rate)
    const discrepancy = Math.abs(1 - product)

    return { forward, reverse, discrepancy }
  }

  /**
   * Get all rates for a specific base currency.
   *
   * @param base - The base currency code
   * @returns Array of rates from this currency
   */
  getRatesFrom(base: string): ExchangeRate[] {
    const rates: ExchangeRate[] = []
    for (const rate of this.#rates.values()) {
      if (rate.from === base) {
        rates.push(rate)
      }
    }
    return rates.sort((a, b) => a.to.localeCompare(b.to))
  }

  /**
   * Get all registered rates.
   */
  getAllRates(): ExchangeRate[] {
    return Array.from(this.#rates.values()).sort((a, b) => {
      const fromCompare = a.from.localeCompare(b.from)
      return fromCompare !== 0 ? fromCompare : a.to.localeCompare(b.to)
    })
  }

  /**
   * Clear all rates.
   */
  clear(): void {
    this.#rates.clear()
  }

  /**
   * Load rates from a simple object.
   *
   * @param rates - Object where keys are "FROM:TO" and values are rates
   * @param source - Optional source identifier
   *
   * @example
   * service.loadRates({
   *   'USD:EUR': 0.92,
   *   'USD:GBP': 0.79,
   * }, 'daily-update')
   */
  loadRates(rates: Record<string, number | string>, source?: string): void {
    for (const [key, rate] of Object.entries(rates)) {
      const [from, to] = key.split(':')
      if (from && to) {
        this.setRate(from, to, rate, source, false) // Don't auto-inverse when batch loading
      }
    }
  }
}
