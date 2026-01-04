"use strict";
/**
 * Money Converter - Safe cross-currency operations.
 *
 * Bridges Money objects with ExchangeRateService to enable:
 * - Currency conversion
 * - Multi-currency arithmetic
 * - Percentage calculations across currencies
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _MoneyConverter_instances, _MoneyConverter_rateService, _MoneyConverter_bankersRound;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneyConverter = void 0;
const money_js_1 = require("./money.js");
const errors_js_1 = require("./errors.js");
const currency_js_1 = require("./currency.js");
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
class MoneyConverter {
    constructor(rateService) {
        _MoneyConverter_instances.add(this);
        _MoneyConverter_rateService.set(this, void 0);
        __classPrivateFieldSet(this, _MoneyConverter_rateService, rateService, "f");
    }
    /**
     * Convert a Money amount to another currency.
     *
     * @param money - The amount to convert
     * @param targetCurrency - The target currency code
     * @returns A new Money in the target currency
     * @throws {ExchangeRateError} If no rate is available
     */
    convert(money, targetCurrency) {
        if (money.currency === targetCurrency) {
            return money;
        }
        const currencyDef = (0, currency_js_1.getCurrency)(targetCurrency);
        if (!currencyDef) {
            throw new errors_js_1.CurrencyUnknownError(targetCurrency);
        }
        const rate = __classPrivateFieldGet(this, _MoneyConverter_rateService, "f").getRate(money.currency, targetCurrency);
        if (!rate) {
            throw new errors_js_1.ExchangeRateError(money.currency, targetCurrency);
        }
        const sourceCurrencyDef = (0, currency_js_1.getCurrency)(money.currency);
        const sourceSubunits = money.toSubunits();
        const sourceMultiplier = 10n ** BigInt(sourceCurrencyDef.decimalDigits);
        const targetMultiplier = 10n ** BigInt(currencyDef.decimalDigits);
        const RATE_PRECISION = 15n;
        const rateMultiplier = 10n ** RATE_PRECISION;
        const rateValue = Number(rate.rate);
        const rateBigInt = BigInt(Math.round(rateValue * Number(rateMultiplier)));
        const product = sourceSubunits * rateBigInt * targetMultiplier;
        const divisor = rateMultiplier * sourceMultiplier;
        const targetSubunits = __classPrivateFieldGet(this, _MoneyConverter_instances, "m", _MoneyConverter_bankersRound).call(this, product, divisor);
        return money_js_1.Money.fromSubunits(targetSubunits, targetCurrency);
    }
    /**
     * Add two Money amounts, converting as needed.
     *
     * @param a - First amount
     * @param b - Second amount
     * @param resultCurrency - Currency for the result (must be one of the input currencies)
     * @returns Sum in the result currency
     */
    add(a, b, resultCurrency) {
        const aConverted = this.convert(a, resultCurrency);
        const bConverted = this.convert(b, resultCurrency);
        return aConverted.add(bConverted);
    }
    /**
     * Subtract two Money amounts, converting as needed.
     *
     * @param a - Amount to subtract from
     * @param b - Amount to subtract
     * @param resultCurrency - Currency for the result
     * @returns Difference in the result currency
     */
    subtract(a, b, resultCurrency) {
        const aConverted = this.convert(a, resultCurrency);
        const bConverted = this.convert(b, resultCurrency);
        return aConverted.subtract(bConverted);
    }
    /**
     * Calculate what percentage one amount is of another.
     * Converts both to the same currency before comparison.
     *
     * @param part - The partial amount
     * @param whole - The whole amount
     * @returns Percentage as a number (e.g., 25 for 25%)
     */
    percentageOf(part, whole) {
        // Convert both to the 'whole' currency for comparison
        const partConverted = this.convert(part, whole.currency);
        return (partConverted.toNumber() / whole.toNumber()) * 100;
    }
    /**
     * Sum multiple Money amounts, converting all to a target currency.
     *
     * @param amounts - Array of Money objects (can be different currencies)
     * @param targetCurrency - Currency for the result
     * @returns Total in the target currency
     */
    sum(amounts, targetCurrency) {
        let total = money_js_1.Money.zero(targetCurrency);
        for (const amount of amounts) {
            const converted = this.convert(amount, targetCurrency);
            total = total.add(converted);
        }
        return total;
    }
    /**
     * Compare two Money amounts across currencies.
     * Returns negative if a < b, zero if equal, positive if a > b.
     *
     * @param a - First amount
     * @param b - Second amount
     * @returns Comparison result
     */
    compare(a, b) {
        // Convert b to a's currency for comparison
        const bConverted = this.convert(b, a.currency);
        return money_js_1.Money.compare(a, bConverted);
    }
    /**
     * Get the exchange rate service (for direct rate access).
     */
    get rateService() {
        return __classPrivateFieldGet(this, _MoneyConverter_rateService, "f");
    }
}
exports.MoneyConverter = MoneyConverter;
_MoneyConverter_rateService = new WeakMap(), _MoneyConverter_instances = new WeakSet(), _MoneyConverter_bankersRound = function _MoneyConverter_bankersRound(numerator, denominator) {
    if (denominator === 1n)
        return numerator;
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    if (remainder === 0n)
        return quotient;
    const halfDenominator = denominator / 2n;
    const absRemainder = remainder < 0n ? -remainder : remainder;
    if (absRemainder > halfDenominator) {
        return numerator < 0n ? quotient - 1n : quotient + 1n;
    }
    if (absRemainder === halfDenominator) {
        const isQuotientEven = quotient % 2n === 0n;
        if (isQuotientEven) {
            return quotient;
        }
        return numerator < 0n ? quotient - 1n : quotient + 1n;
    }
    return quotient;
};
