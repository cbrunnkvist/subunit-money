"use strict";
/**
 * Custom error types for Money operations.
 * All errors extend built-in Error types for proper instanceof checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeRateError = exports.AmountError = exports.SubunitError = exports.CurrencyUnknownError = exports.CurrencyMismatchError = void 0;
/**
 * Thrown when attempting operations between different currencies.
 * @example
 * new Money('USD', 10).add(new Money('EUR', 5)) // throws CurrencyMismatchError
 */
class CurrencyMismatchError extends TypeError {
    constructor(fromCurrency, toCurrency) {
        super(`Cannot operate on ${fromCurrency} and ${toCurrency} - currencies must match`);
        this.name = 'CurrencyMismatchError';
        this.fromCurrency = fromCurrency;
        this.toCurrency = toCurrency;
        Error.captureStackTrace?.(this, CurrencyMismatchError);
    }
}
exports.CurrencyMismatchError = CurrencyMismatchError;
/**
 * Thrown when using an unregistered currency code.
 * @example
 * new Money('FAKE', 10) // throws CurrencyUnknownError
 */
class CurrencyUnknownError extends TypeError {
    constructor(currency) {
        super(`Unknown currency '${currency}' - register it first with Money.registerCurrency()`);
        this.name = 'CurrencyUnknownError';
        this.currency = currency;
        Error.captureStackTrace?.(this, CurrencyUnknownError);
    }
}
exports.CurrencyUnknownError = CurrencyUnknownError;
/**
 * Thrown when an amount has more decimal places than the currency allows.
 * @example
 * new Money('USD', '1.234') // throws SubunitError (USD only allows 2 decimals)
 */
class SubunitError extends RangeError {
    constructor(currency, maxDecimals) {
        super(`${currency} only supports ${maxDecimals} decimal place(s)`);
        this.name = 'SubunitError';
        this.currency = currency;
        this.maxDecimals = maxDecimals;
        Error.captureStackTrace?.(this, SubunitError);
    }
}
exports.SubunitError = SubunitError;
/**
 * Thrown when an amount cannot be parsed as a valid number.
 * @example
 * new Money('USD', 'abc') // throws AmountError
 */
class AmountError extends TypeError {
    constructor(amount) {
        super(`Invalid amount: ${JSON.stringify(amount)}`);
        this.name = 'AmountError';
        this.amount = amount;
        Error.captureStackTrace?.(this, AmountError);
    }
}
exports.AmountError = AmountError;
/**
 * Thrown when an exchange rate is not available.
 * @example
 * converter.convert(usdMoney, 'XYZ') // throws ExchangeRateError if no USD->XYZ rate
 */
class ExchangeRateError extends Error {
    constructor(fromCurrency, toCurrency) {
        super(`No exchange rate available from ${fromCurrency} to ${toCurrency}`);
        this.name = 'ExchangeRateError';
        this.fromCurrency = fromCurrency;
        this.toCurrency = toCurrency;
        Error.captureStackTrace?.(this, ExchangeRateError);
    }
}
exports.ExchangeRateError = ExchangeRateError;
