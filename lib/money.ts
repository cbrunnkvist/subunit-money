/**
 * Money - An immutable value object for monetary amounts.
 *
 * Design principles:
 * - Immutable: all operations return new instances
 * - Type-safe: currency mismatches are caught at compile time (when possible) and runtime
 * - Precise: uses BigInt internally to avoid floating-point errors
 * - String-based API: amounts are strings to preserve precision in JSON/DB round-trips
 */

import {
  CurrencyMismatchError,
  CurrencyUnknownError,
  SubunitError,
  AmountError,
} from './errors.js'
import { getCurrency, hasCurrency, type CurrencyDefinition } from './currency.js'

/**
 * Serialized form of a Money object, safe for JSON.
 */
export interface MoneyObject<C extends string = string> {
  currency: C
  amount: string
}

/**
 * Money class - represents a monetary amount in a specific currency.
 *
 * @typeParam C - The currency code type (enables compile-time currency checking)
 *
 * @example
 * const price = new Money('USD', '19.99')
 * const tax = price.multiply(0.08)
 * const total = price.add(tax)
 * console.log(total.amount) // "21.59"
 */
export class Money<C extends string = string> {
  readonly currency: C

  // Private BigInt storage - stores currency native subunits directly
  readonly #subunits: bigint
  readonly #currencyDef: CurrencyDefinition

  /**
   * Create a new Money instance.
   *
   * @param currency - ISO 4217 currency code (must be registered)
   * @param amount - The amount as a number or string
   * @throws {CurrencyUnknownError} If the currency is not registered
   * @throws {AmountError} If the amount is not a valid number
   * @throws {SubunitError} If the amount has more decimals than the currency allows
   */
  constructor(currency: C, amount: number | string) {
    const currencyDef = getCurrency(currency)
    if (!currencyDef) {
      throw new CurrencyUnknownError(currency)
    }

    this.currency = currency
    this.#currencyDef = currencyDef
    this.#subunits = this.#parseAmount(amount)
  }

  /**
   * Parse an amount into native subunits.
   */
  #parseAmount(amount: number | string): bigint {
    const str = typeof amount === 'number' ? String(amount) : amount

    const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/)
    if (!match) {
      throw new AmountError(amount)
    }

    const [, sign, whole, frac = ''] = match

    if (frac.length > this.#currencyDef.decimalDigits) {
      throw new SubunitError(this.currency, this.#currencyDef.decimalDigits)
    }

    const paddedFrac = frac.padEnd(this.#currencyDef.decimalDigits, '0')
    const combined = BigInt(whole + paddedFrac)

    return sign === '-' ? -combined : combined
  }

  /**
   * The amount as a formatted string with correct decimal places.
   * @example
   * new Money('USD', 19.9).amount // "19.90"
   * new Money('JPY', 1000).amount // "1000"
   */
  get amount(): string {
    const decimals = this.#currencyDef.decimalDigits
    const abs = this.#subunits < 0n ? -this.#subunits : this.#subunits
    const isNegative = this.#subunits < 0n

    if (decimals === 0) {
      return `${isNegative ? '-' : ''}${abs}`
    }

    const multiplier = 10n ** BigInt(decimals)
    const wholePart = abs / multiplier
    const fracPart = abs % multiplier

    const sign = isNegative ? '-' : ''
    return `${sign}${wholePart}.${fracPart.toString().padStart(decimals, '0')}`
  }

  /**
   * Ensure another Money has the same currency.
   */
  #assertSameCurrency(other: Money<string>): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency)
    }
  }

  /**
   * Get the internal BigInt value (for operations).
   */
  #getInternalValue(): bigint {
    return this.#subunits
  }

  // ============ Arithmetic Operations ============

  /**
   * Add another Money amount.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  add(other: Money<C>): Money<C> {
    this.#assertSameCurrency(other)
    const result = this.#subunits + other.#getInternalValue()
    return Money.#createFromSubunits(result, this.currency, this.#currencyDef)
  }

  /**
   * Subtract another Money amount.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  subtract(other: Money<C>): Money<C> {
    this.#assertSameCurrency(other)
    const result = this.#subunits - other.#getInternalValue()
    return Money.#createFromSubunits(result, this.currency, this.#currencyDef)
  }

  /**
   * Multiply by a factor.
   *
   * DESIGN: Rounds immediately after multiplication using banker's rounding
   * (round half-to-even). This prevents the "split penny problem".
   */
  multiply(factor: number): Money<C> {
    if (typeof factor !== 'number' || !Number.isFinite(factor)) {
      throw new TypeError(`Factor must be a finite number, got: ${factor}`)
    }

    const { value: factorValue, scale } = Money.#parseFactor(factor)
    const product = this.#subunits * factorValue
    const divisor = 10n ** scale
    
    const result = Money.#roundedDivide(product, divisor)
    return Money.#createFromSubunits(result, this.currency, this.#currencyDef)
  }

  /**
   * Helper to parse a number factor into a BigInt and a power-of-10 scale.
   * Uses String() conversion to avoid floating-point epsilon noise,
   * ensuring that 0.545 is treated as exactly 0.545, not 0.54500000000000004.
   */
  static #parseFactor(factor: number): { value: bigint, scale: bigint } {
    const str = String(factor)
    const [base, exponent] = str.split('e')
    
    const baseMatch = base.match(/^(-)?(\d+)(?:\.(\d+))?$/)
    if (!baseMatch) {
      // Fallback for unlikely cases, though String(number) should strictly produce valid formats
      throw new TypeError(`Invalid factor format: ${str}`)
    }
    
    const [, sign, whole, frac = ''] = baseMatch
    const baseValue = BigInt((sign || '') + whole + frac)
    const baseDecimals = frac.length
    
    const exp = exponent ? Number(exponent) : 0
    const netExp = exp - baseDecimals
    
    if (netExp >= 0) {
      return { value: baseValue * 10n ** BigInt(netExp), scale: 0n }
    } else {
      return { value: baseValue, scale: BigInt(-netExp) }
    }
  }

  /**
   * Divide with banker's rounding (round half-to-even).
   * IEEE 754-2008 recommended default rounding mode for financial calculations.
   */
  static #roundedDivide(numerator: bigint, denominator: bigint): bigint {
    if (denominator === 1n) return numerator

    const quotient = numerator / denominator
    const remainder = numerator % denominator
    if (remainder === 0n) return quotient

    const halfDenominator = denominator / 2n
    const absRemainder = remainder < 0n ? -remainder : remainder

    if (absRemainder > halfDenominator) {
      return numerator < 0n ? quotient - 1n : quotient + 1n
    }

    if (absRemainder === halfDenominator) {
      const isQuotientEven = quotient % 2n === 0n
      if (isQuotientEven) {
        return quotient
      }
      return numerator < 0n ? quotient - 1n : quotient + 1n
    }

    return quotient
  }

  /**
   * Allocate this amount proportionally.
   * Handles remainder distribution to avoid losing pennies.
   *
   * @param proportions - Array of proportions (e.g., [1, 1, 1] for three-way split)
   * @returns Array of Money objects that sum to the original amount
   */
  allocate(proportions: number[]): Money<C>[] {
    if (!Array.isArray(proportions) || proportions.length === 0) {
      throw new TypeError('Proportions must be a non-empty array')
    }

    for (const p of proportions) {
      if (typeof p !== 'number' || !Number.isFinite(p) || p < 0) {
        throw new TypeError('All proportions must be non-negative finite numbers')
      }
    }

    const total = proportions.reduce((sum, p) => sum + p, 0)
    if (total <= 0) {
      throw new TypeError('Sum of proportions must be positive')
    }

    const totalSubunits = this.#subunits

    // Calculate base allocations
    const allocations: bigint[] = proportions.map((p) => {
      return (totalSubunits * BigInt(Math.round(p * 1000000))) / BigInt(Math.round(total * 1000000))
    })

    // Distribute remainder
    let remainder = totalSubunits - allocations.reduce((sum, a) => sum + a, 0n)
    let i = 0
    while (remainder > 0n) {
      allocations[i % allocations.length] += 1n
      remainder -= 1n
      i++
    }
    while (remainder < 0n) {
      allocations[i % allocations.length] -= 1n
      remainder += 1n
      i++
    }

    // Convert back to Money objects
    return allocations.map((subunits) => {
      return Money.#createFromSubunits(subunits, this.currency, this.#currencyDef)
    })
  }

  // ============ Comparison Operations ============

  /**
   * Check if this amount equals another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  equalTo(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#subunits === other.#getInternalValue()
  }

  /**
   * Check if this amount is greater than another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  greaterThan(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#subunits > other.#getInternalValue()
  }

  /**
   * Check if this amount is less than another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  lessThan(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#subunits < other.#getInternalValue()
  }

  /**
   * Check if this amount is greater than or equal to another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  greaterThanOrEqual(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#subunits >= other.#getInternalValue()
  }

  /**
   * Check if this amount is less than or equal to another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  lessThanOrEqual(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#subunits <= other.#getInternalValue()
  }

  /**
   * Check if this amount is zero.
   */
  isZero(): boolean {
    return this.#subunits === 0n
  }

  /**
   * Check if this amount is positive (greater than zero).
   */
  isPositive(): boolean {
    return this.#subunits > 0n
  }

  /**
   * Check if this amount is negative (less than zero).
   */
  isNegative(): boolean {
    return this.#subunits < 0n
  }

  // ============ Serialization ============

  /**
   * Convert to a plain object (safe for JSON).
   */
  toJSON(): MoneyObject<C> {
    return {
      currency: this.currency,
      amount: this.amount,
    }
  }

  /**
   * Convert to string representation.
   */
  toString(): string {
    return `${this.amount} ${this.currency}`
  }

  /**
   * Get the amount as a number (may lose precision for large values).
   * Use with caution - prefer string-based operations.
   */
  toNumber(): number {
    return Number(this.amount)
  }

  /**
   * Get the amount in subunits (e.g., cents for USD).
   * Useful for database storage (Stripe-style integer storage).
   */
  toSubunits(): bigint {
    return this.#subunits
  }

  // ============ Static Factory Methods ============

  /**
   * Create a Money instance from a plain object.
   */
  static fromObject<C extends string>(obj: MoneyObject<C>): Money<C> {
    return new Money(obj.currency, obj.amount)
  }

  /**
   * Create a Money instance from subunits (e.g., cents).
   * Useful for loading from database (Stripe-style integer storage).
   */
  static fromSubunits<C extends string>(subunits: bigint | number, currency: C): Money<C> {
    const currencyDef = getCurrency(currency)
    if (!currencyDef) {
      throw new CurrencyUnknownError(currency)
    }

    const bigintSubunits = typeof subunits === 'number' ? BigInt(subunits) : subunits
    return Money.#createFromSubunits(bigintSubunits, currency, currencyDef)
  }

  /**
   * Compare two Money objects (for use with Array.sort).
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  static compare<C extends string>(a: Money<C>, b: Money<C>): -1 | 0 | 1 {
    if (a.currency !== b.currency) {
      throw new CurrencyMismatchError(a.currency, b.currency)
    }
    const aVal = a.#getInternalValue()
    const bVal = b.#getInternalValue()
    if (aVal < bVal) return -1
    if (aVal > bVal) return 1
    return 0
  }

  /**
   * Create a zero amount in the specified currency.
   */
  static zero<C extends string>(currency: C): Money<C> {
    return new Money(currency, '0')
  }

  /**
   * Internal factory that bypasses parsing.
   */
  static #createFromSubunits<C extends string>(
    subunits: bigint,
    currency: C,
    currencyDef: CurrencyDefinition
  ): Money<C> {
    return new Money(currency, Money.#formatSubunits(subunits, currencyDef))
  }

  /**
   * Format subunits to string amount.
   */
  static #formatSubunits(subunits: bigint, currencyDef: CurrencyDefinition): string {
    const decimals = currencyDef.decimalDigits
    const abs = subunits < 0n ? -subunits : subunits
    const isNegative = subunits < 0n

    if (decimals === 0) {
      return `${isNegative ? '-' : ''}${abs}`
    }

    const multiplier = 10n ** BigInt(decimals)
    const wholePart = abs / multiplier
    const fracPart = abs % multiplier

    const sign = isNegative ? '-' : ''
    return `${sign}${wholePart}.${fracPart.toString().padStart(decimals, '0')}`
  }
}
