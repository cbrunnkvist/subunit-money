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
interface MoneyObject<C extends string = string> {
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
declare class Money<C extends string = string> {
    #private;
    readonly currency: C;
    readonly amount: string;
    readonly displayAmount: string;
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
     *
     * DESIGN: Rounds immediately after multiplication using banker's rounding
     * (round half-to-even). This prevents the "split penny problem".
     */
    multiply(factor: number): Money<C>;
    /**
     * Allocate this amount proportionally.
     * Handles remainder distribution to avoid losing pennies.
     *
     * @param proportions - Array of proportions (e.g., [1, 1, 1] for three-way split)
     * @returns Array of Money objects that sum to the original amount
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

/**
 * Exchange Rate Service - Central authority for currency conversion rates.
 *
 * Design principles:
 * - Rates are stored as strings to preserve precision
 * - Timestamps track when rates were set
 * - Optional source tracking for audit trails
 * - Inverse rates can be auto-generated or explicitly set
 */
interface ExchangeRate {
    from: string;
    to: string;
    rate: string;
    timestamp: Date;
    source?: string;
}
interface RatePair {
    forward: ExchangeRate;
    reverse: ExchangeRate;
    /** Relative discrepancy between forward and 1/reverse rates */
    discrepancy: number;
}
/**
 * Service for managing exchange rates between currencies.
 *
 * @example
 * const rates = new ExchangeRateService()
 * rates.setRate('USD', 'EUR', 0.92, 'ECB')
 * rates.getRate('USD', 'EUR') // { from: 'USD', to: 'EUR', rate: '0.92', ... }
 */
declare class ExchangeRateService {
    #private;
    /**
     * Set an exchange rate.
     *
     * @param from - Source currency code
     * @param to - Target currency code
     * @param rate - Exchange rate (1 unit of 'from' = rate units of 'to')
     * @param source - Optional source identifier (e.g., 'ECB', 'Coinbase')
     * @param autoInverse - If true, automatically create inverse rate (default: true)
     */
    setRate(from: string, to: string, rate: number | string, source?: string, autoInverse?: boolean): void;
    /**
     * Get an exchange rate.
     *
     * @param from - Source currency code
     * @param to - Target currency code
     * @returns The exchange rate, or undefined if not set
     */
    getRate(from: string, to: string): ExchangeRate | undefined;
    /**
     * Check if a rate exists.
     */
    hasRate(from: string, to: string): boolean;
    /**
     * Remove a rate.
     */
    removeRate(from: string, to: string): boolean;
    /**
     * Get both forward and reverse rates, with discrepancy analysis.
     * Useful for detecting rate inconsistencies.
     *
     * @param currencyA - First currency
     * @param currencyB - Second currency
     * @returns Rate pair with discrepancy, or undefined if either rate is missing
     */
    getRatePair(currencyA: string, currencyB: string): RatePair | undefined;
    /**
     * Get all rates for a specific base currency.
     *
     * @param base - The base currency code
     * @returns Array of rates from this currency
     */
    getRatesFrom(base: string): ExchangeRate[];
    /**
     * Get all registered rates.
     */
    getAllRates(): ExchangeRate[];
    /**
     * Clear all rates.
     */
    clear(): void;
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
    loadRates(rates: Record<string, number | string>, source?: string): void;
}

/**
 * Money Converter - Safe cross-currency operations.
 *
 * Bridges Money objects with ExchangeRateService to enable:
 * - Currency conversion
 * - Multi-currency arithmetic
 * - Percentage calculations across currencies
 */

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
declare class MoneyConverter {
    #private;
    constructor(rateService: ExchangeRateService);
    /**
     * Convert a Money amount to another currency.
     *
     * @param money - The amount to convert
     * @param targetCurrency - The target currency code
     * @returns A new Money in the target currency
     * @throws {ExchangeRateError} If no rate is available
     */
    convert<From extends string, To extends string>(money: Money<From>, targetCurrency: To): Money<To>;
    /**
     * Add two Money amounts, converting as needed.
     *
     * @param a - First amount
     * @param b - Second amount
     * @param resultCurrency - Currency for the result (must be one of the input currencies)
     * @returns Sum in the result currency
     */
    add<A extends string, B extends string, R extends A | B>(a: Money<A>, b: Money<B>, resultCurrency: R): Money<R>;
    /**
     * Subtract two Money amounts, converting as needed.
     *
     * @param a - Amount to subtract from
     * @param b - Amount to subtract
     * @param resultCurrency - Currency for the result
     * @returns Difference in the result currency
     */
    subtract<A extends string, B extends string, R extends A | B>(a: Money<A>, b: Money<B>, resultCurrency: R): Money<R>;
    /**
     * Calculate what percentage one amount is of another.
     * Converts both to the same currency before comparison.
     *
     * @param part - The partial amount
     * @param whole - The whole amount
     * @returns Percentage as a number (e.g., 25 for 25%)
     */
    percentageOf<A extends string, B extends string>(part: Money<A>, whole: Money<B>): number;
    /**
     * Sum multiple Money amounts, converting all to a target currency.
     *
     * @param amounts - Array of Money objects (can be different currencies)
     * @param targetCurrency - Currency for the result
     * @returns Total in the target currency
     */
    sum<C extends string>(amounts: Money<string>[], targetCurrency: C): Money<C>;
    /**
     * Compare two Money amounts across currencies.
     * Returns negative if a < b, zero if equal, positive if a > b.
     *
     * @param a - First amount
     * @param b - Second amount
     * @returns Comparison result
     */
    compare<A extends string, B extends string>(a: Money<A>, b: Money<B>): -1 | 0 | 1;
    /**
     * Get the exchange rate service (for direct rate access).
     */
    get rateService(): ExchangeRateService;
}

/**
 * Custom error types for Money operations.
 * All errors extend built-in Error types for proper instanceof checks.
 */
/**
 * Thrown when attempting operations between different currencies.
 * @example
 * new Money('USD', 10).add(new Money('EUR', 5)) // throws CurrencyMismatchError
 */
declare class CurrencyMismatchError extends TypeError {
    readonly fromCurrency: string;
    readonly toCurrency: string;
    constructor(fromCurrency: string, toCurrency: string);
}
/**
 * Thrown when using an unregistered currency code.
 * @example
 * new Money('FAKE', 10) // throws CurrencyUnknownError
 */
declare class CurrencyUnknownError extends TypeError {
    readonly currency: string;
    constructor(currency: string);
}
/**
 * Thrown when an amount has more decimal places than the currency allows.
 * @example
 * new Money('USD', '1.234') // throws SubunitError (USD only allows 2 decimals)
 */
declare class SubunitError extends RangeError {
    readonly currency: string;
    readonly maxDecimals: number;
    constructor(currency: string, maxDecimals: number);
}
/**
 * Thrown when an amount cannot be parsed as a valid number.
 * @example
 * new Money('USD', 'abc') // throws AmountError
 */
declare class AmountError extends TypeError {
    readonly amount: unknown;
    constructor(amount: unknown);
}
/**
 * Thrown when an exchange rate is not available.
 * @example
 * converter.convert(usdMoney, 'XYZ') // throws ExchangeRateError if no USD->XYZ rate
 */
declare class ExchangeRateError extends Error {
    readonly fromCurrency: string;
    readonly toCurrency: string;
    constructor(fromCurrency: string, toCurrency: string);
}

/**
 * Currency registry and types.
 * Manages ISO 4217 currency definitions and custom currencies.
 */
interface CurrencyDefinition {
    code: string;
    decimalDigits: number;
    displayDecimals?: number;
}
/**
 * Register a new currency or update an existing one.
 * @param code - ISO 4217 currency code (e.g., 'USD', 'EUR', 'BTC')
 * @param decimalDigits - Number of decimal places (e.g., 2 for USD, 8 for BTC)
 * @param displayDecimals - Optional number of decimal places to use for display/formatting (defaults to decimalDigits)
 */
declare function registerCurrency(code: string, decimalDigits: number, displayDecimals?: number): void;
/**
 * Get a currency definition by code.
 * @returns The currency definition, or undefined if not registered
 */
/**
 * @internal
 */
declare function getCurrency(code: string): CurrencyDefinition | undefined;
/**
 * Check if a currency is registered.
 */
/**
 * @internal
 */
declare function hasCurrency(code: string): boolean;
/**
 * @internal
 */
declare function getAllCurrencies(): CurrencyDefinition[];
/**
 * @internal
 */
declare function loadCurrencyMap(map: Record<string, {
    decimal_digits: number;
}>): void;
/**
 * @internal
 */
declare function clearCurrencies(): void;

export { AmountError, type CurrencyDefinition, CurrencyMismatchError, CurrencyUnknownError, type ExchangeRate, ExchangeRateError, ExchangeRateService, Money, MoneyConverter, type MoneyObject, type RatePair, SubunitError, clearCurrencies, getAllCurrencies, getCurrency, hasCurrency, loadCurrencyMap, registerCurrency };
