/**
 * Custom error types for Money operations.
 * All errors extend built-in Error types for proper instanceof checks.
 */
/**
 * Thrown when attempting operations between different currencies.
 * @example
 * new Money('USD', 10).add(new Money('EUR', 5)) // throws CurrencyMismatchError
 */
export declare class CurrencyMismatchError extends TypeError {
    readonly fromCurrency: string;
    readonly toCurrency: string;
    constructor(fromCurrency: string, toCurrency: string);
}
/**
 * Thrown when using an unregistered currency code.
 * @example
 * new Money('FAKE', 10) // throws CurrencyUnknownError
 */
export declare class CurrencyUnknownError extends TypeError {
    readonly currency: string;
    constructor(currency: string);
}
/**
 * Thrown when an amount has more decimal places than the currency allows.
 * @example
 * new Money('USD', '1.234') // throws SubunitError (USD only allows 2 decimals)
 */
export declare class SubunitError extends RangeError {
    readonly currency: string;
    readonly maxDecimals: number;
    constructor(currency: string, maxDecimals: number);
}
/**
 * Thrown when an amount cannot be parsed as a valid number.
 * @example
 * new Money('USD', 'abc') // throws AmountError
 */
export declare class AmountError extends TypeError {
    readonly amount: unknown;
    constructor(amount: unknown);
}
/**
 * Thrown when an exchange rate is not available.
 * @example
 * converter.convert(usdMoney, 'XYZ') // throws ExchangeRateError if no USD->XYZ rate
 */
export declare class ExchangeRateError extends Error {
    readonly fromCurrency: string;
    readonly toCurrency: string;
    constructor(fromCurrency: string, toCurrency: string);
}
