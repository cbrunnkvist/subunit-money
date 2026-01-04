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

// Internal precision: 8 decimal places (supports Bitcoin and most cryptocurrencies)
const INTERNAL_PRECISION = 8
const PRECISION_MULTIPLIER = 10n ** BigInt(INTERNAL_PRECISION)

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

  // Private BigInt storage - not exposed to prevent precision leaks
  readonly #value: bigint
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
    this.#value = this.#parseAmount(amount)
  }

  /**
   * Parse an amount into internal BigInt representation.
   */
  #parseAmount(amount: number | string): bigint {
    // Convert to string for consistent parsing
    const str = typeof amount === 'number' ? String(amount) : amount

    // Validate format: optional minus, digits, optional decimal part
    const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/)
    if (!match) {
      throw new AmountError(amount)
    }

    const [, sign, whole, frac = ''] = match

    // Check decimal places don't exceed currency limit
    if (frac.length > this.#currencyDef.decimalDigits) {
      throw new SubunitError(this.currency, this.#currencyDef.decimalDigits)
    }

    // Pad fraction to internal precision and combine
    const paddedFrac = frac.padEnd(INTERNAL_PRECISION, '0')
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
    const divisor = 10n ** BigInt(INTERNAL_PRECISION - decimals)
    const adjusted = this.#value / divisor

    const isNegative = adjusted < 0n
    const abs = isNegative ? -adjusted : adjusted

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
    return this.#value
  }

  // ============ Arithmetic Operations ============

  /**
   * Add another Money amount.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  add(other: Money<C>): Money<C> {
    this.#assertSameCurrency(other)
    const result = this.#value + other.#getInternalValue()
    return Money.#createFromInternal(result, this.currency, this.#currencyDef)
  }

  /**
   * Subtract another Money amount.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  subtract(other: Money<C>): Money<C> {
    this.#assertSameCurrency(other)
    const result = this.#value - other.#getInternalValue()
    return Money.#createFromInternal(result, this.currency, this.#currencyDef)
  }

  /**
   * Multiply by a factor.
   * Result is rounded using half-up rounding (standard financial rounding).
   */
  multiply(factor: number): Money<C> {
    if (typeof factor !== 'number' || !Number.isFinite(factor)) {
      throw new TypeError(`Factor must be a finite number, got: ${factor}`)
    }

    const factorStr = factor.toFixed(INTERNAL_PRECISION)
    const factorBigInt = BigInt(factorStr.replace('.', ''))

    const product = this.#value * factorBigInt
    const result = Money.#roundedDivide(product, PRECISION_MULTIPLIER)
    return Money.#createFromInternal(result, this.currency, this.#currencyDef)
  }

  /**
   * Divide with half-up rounding (standard financial rounding).
   */
  static #roundedDivide(numerator: bigint, denominator: bigint): bigint {
    if (denominator === 1n) return numerator

    const quotient = numerator / denominator
    const remainder = numerator % denominator
    if (remainder === 0n) return quotient

    const halfDenominator = denominator / 2n
    const absRemainder = remainder < 0n ? -remainder : remainder
    if (absRemainder >= halfDenominator) {
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
   *
   * @example
   * new Money('USD', '100').allocate([1, 1, 1])
   * // Returns: [Money('33.34'), Money('33.33'), Money('33.33')]
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

    // Work in currency subunits to avoid precision loss
    const decimals = this.#currencyDef.decimalDigits
    const subunitMultiplier = 10n ** BigInt(INTERNAL_PRECISION - decimals)
    const totalSubunits = this.#value / subunitMultiplier

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
      const internalValue = subunits * subunitMultiplier
      return Money.#createFromInternal(internalValue, this.currency, this.#currencyDef)
    })
  }

  // ============ Comparison Operations ============

  /**
   * Check if this amount equals another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  equalTo(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#value === other.#getInternalValue()
  }

  /**
   * Check if this amount is greater than another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  greaterThan(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#value > other.#getInternalValue()
  }

  /**
   * Check if this amount is less than another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  lessThan(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#value < other.#getInternalValue()
  }

  /**
   * Check if this amount is greater than or equal to another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  greaterThanOrEqual(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#value >= other.#getInternalValue()
  }

  /**
   * Check if this amount is less than or equal to another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  lessThanOrEqual(other: Money<C>): boolean {
    this.#assertSameCurrency(other)
    return this.#value <= other.#getInternalValue()
  }

  /**
   * Check if this amount is zero.
   */
  isZero(): boolean {
    return this.#value === 0n
  }

  /**
   * Check if this amount is positive (greater than zero).
   */
  isPositive(): boolean {
    return this.#value > 0n
  }

  /**
   * Check if this amount is negative (less than zero).
   */
  isNegative(): boolean {
    return this.#value < 0n
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
    const decimals = this.#currencyDef.decimalDigits
    const divisor = 10n ** BigInt(INTERNAL_PRECISION - decimals)
    return this.#value / divisor
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
    const multiplier = 10n ** BigInt(INTERNAL_PRECISION - currencyDef.decimalDigits)
    const internalValue = bigintSubunits * multiplier

    return Money.#createFromInternal(internalValue, currency, currencyDef)
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
  static #createFromInternal<C extends string>(
    value: bigint,
    currency: C,
    currencyDef: CurrencyDefinition
  ): Money<C> {
    const instance = Object.create(Money.prototype) as Money<C>

    // Use Object.defineProperties for proper initialization
    Object.defineProperties(instance, {
      currency: { value: currency, enumerable: true, writable: false },
    })

    // Access private fields via the class mechanism
    // This is a workaround since we can't directly set #private fields on Object.create instances
    // Instead, we'll use a different approach: call a private static method

    return new Money(currency, Money.#formatInternalValue(value, currencyDef))
  }

  /**
   * Format internal BigInt value to string amount with proper rounding.
   */
  static #formatInternalValue(value: bigint, currencyDef: CurrencyDefinition): string {
    const decimals = currencyDef.decimalDigits
    const divisor = 10n ** BigInt(INTERNAL_PRECISION - decimals)
    const adjusted = Money.#roundedDivide(value, divisor)

    const isNegative = adjusted < 0n
    const abs = isNegative ? -adjusted : adjusted

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
