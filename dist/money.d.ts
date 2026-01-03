/**
 * Money - An immutable value object for monetary amounts.
 *
 * Design principles:
 * - Immutable: all operations return new instances
 * - Type-safe: currency mismatches are caught at compile time (when possible) and runtime
 * - Precise: uses BigInt internally to avoid floating-point errors
 * - String-based API: amounts are strings to preserve precision in JSON/DB round-trips
 */
/**
 * Serialized form of a Money object, safe for JSON.
 */
export interface MoneyObject<C extends string = string> {
    currency: C;
    amount: string;
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
export declare class Money<C extends string = string> {
    #private;
    readonly currency: C;
    /**
     * Create a new Money instance.
     *
     * @param currency - ISO 4217 currency code (must be registered)
     * @param amount - The amount as a number or string
     * @throws {CurrencyUnknownError} If the currency is not registered
     * @throws {AmountError} If the amount is not a valid number
     * @throws {SubunitError} If the amount has more decimals than the currency allows
     */
    constructor(currency: C, amount: number | string);
    /**
     * The amount as a formatted string with correct decimal places.
     * @example
     * new Money('USD', 19.9).amount // "19.90"
     * new Money('JPY', 1000).amount // "1000"
     */
    get amount(): string;
    /**
     * Add another Money amount.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    add(other: Money<C>): Money<C>;
    /**
     * Subtract another Money amount.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    subtract(other: Money<C>): Money<C>;
    /**
     * Multiply by a factor.
     * Result is rounded to the currency's decimal places using banker's rounding.
     */
    multiply(factor: number): Money<C>;
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
    allocate(proportions: number[]): Money<C>[];
    /**
     * Check if this amount equals another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    equalTo(other: Money<C>): boolean;
    /**
     * Check if this amount is greater than another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    greaterThan(other: Money<C>): boolean;
    /**
     * Check if this amount is less than another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    lessThan(other: Money<C>): boolean;
    /**
     * Check if this amount is greater than or equal to another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    greaterThanOrEqual(other: Money<C>): boolean;
    /**
     * Check if this amount is less than or equal to another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    lessThanOrEqual(other: Money<C>): boolean;
    /**
     * Check if this amount is zero.
     */
    isZero(): boolean;
    /**
     * Check if this amount is positive (greater than zero).
     */
    isPositive(): boolean;
    /**
     * Check if this amount is negative (less than zero).
     */
    isNegative(): boolean;
    /**
     * Convert to a plain object (safe for JSON).
     */
    toJSON(): MoneyObject<C>;
    /**
     * Convert to string representation.
     */
    toString(): string;
    /**
     * Get the amount as a number (may lose precision for large values).
     * Use with caution - prefer string-based operations.
     */
    toNumber(): number;
    /**
     * Get the amount in subunits (e.g., cents for USD).
     * Useful for database storage (Stripe-style integer storage).
     */
    toSubunits(): bigint;
    /**
     * Create a Money instance from a plain object.
     */
    static fromObject<C extends string>(obj: MoneyObject<C>): Money<C>;
    /**
     * Create a Money instance from subunits (e.g., cents).
     * Useful for loading from database (Stripe-style integer storage).
     */
    static fromSubunits<C extends string>(subunits: bigint | number, currency: C): Money<C>;
    /**
     * Compare two Money objects (for use with Array.sort).
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    static compare<C extends string>(a: Money<C>, b: Money<C>): -1 | 0 | 1;
    /**
     * Create a zero amount in the specified currency.
     */
    static zero<C extends string>(currency: C): Money<C>;
}
