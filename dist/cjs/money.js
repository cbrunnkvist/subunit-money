"use strict";
/**
 * Money - An immutable value object for monetary amounts.
 *
 * Design principles:
 * - Immutable: all operations return new instances
 * - Type-safe: currency mismatches are caught at compile time (when possible) and runtime
 * - Precise: uses BigInt internally to avoid floating-point errors
 * - String-based API: amounts are strings to preserve precision in JSON/DB round-trips
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
var _Money_instances, _a, _Money_subunits, _Money_currencyDef, _Money_parseAmount, _Money_assertSameCurrency, _Money_getInternalValue, _Money_parseFactor, _Money_roundedDivide, _Money_createFromSubunits, _Money_formatSubunits;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const errors_js_1 = require("./errors.js");
const currency_js_1 = require("./currency.js");
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
class Money {
    /**
     * Create a new Money instance.
     *
     * @param currency - ISO 4217 currency code (must be registered)
     * @param amount - The amount as a number or string
     * @throws {CurrencyUnknownError} If the currency is not registered
     * @throws {AmountError} If the amount is not a valid number
     * @throws {SubunitError} If the amount has more decimals than the currency allows
     */
    constructor(currency, amount) {
        _Money_instances.add(this);
        // Private BigInt storage - stores currency native subunits directly
        _Money_subunits.set(this, void 0);
        _Money_currencyDef.set(this, void 0);
        const currencyDef = (0, currency_js_1.getCurrency)(currency);
        if (!currencyDef) {
            throw new errors_js_1.CurrencyUnknownError(currency);
        }
        this.currency = currency;
        __classPrivateFieldSet(this, _Money_currencyDef, currencyDef, "f");
        __classPrivateFieldSet(this, _Money_subunits, __classPrivateFieldGet(this, _Money_instances, "m", _Money_parseAmount).call(this, amount), "f");
    }
    /**
     * The amount as a formatted string with correct decimal places.
     * @example
     * new Money('USD', 19.9).amount // "19.90"
     * new Money('JPY', 1000).amount // "1000"
     */
    get amount() {
        const decimals = __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits;
        const abs = __classPrivateFieldGet(this, _Money_subunits, "f") < 0n ? -__classPrivateFieldGet(this, _Money_subunits, "f") : __classPrivateFieldGet(this, _Money_subunits, "f");
        const isNegative = __classPrivateFieldGet(this, _Money_subunits, "f") < 0n;
        if (decimals === 0) {
            return `${isNegative ? '-' : ''}${abs}`;
        }
        const multiplier = 10n ** BigInt(decimals);
        const wholePart = abs / multiplier;
        const fracPart = abs % multiplier;
        const sign = isNegative ? '-' : '';
        return `${sign}${wholePart}.${fracPart.toString().padStart(decimals, '0')}`;
    }
    // ============ Arithmetic Operations ============
    /**
     * Add another Money amount.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    add(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        const result = __classPrivateFieldGet(this, _Money_subunits, "f") + __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromSubunits).call(_a, result, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
    }
    /**
     * Subtract another Money amount.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    subtract(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        const result = __classPrivateFieldGet(this, _Money_subunits, "f") - __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromSubunits).call(_a, result, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
    }
    /**
     * Multiply by a factor.
     *
     * DESIGN: Rounds immediately after multiplication using banker's rounding
     * (round half-to-even). This prevents the "split penny problem".
     */
    multiply(factor) {
        if (typeof factor !== 'number' || !Number.isFinite(factor)) {
            throw new TypeError(`Factor must be a finite number, got: ${factor}`);
        }
        const { value: factorValue, scale } = __classPrivateFieldGet(_a, _a, "m", _Money_parseFactor).call(_a, factor);
        const product = __classPrivateFieldGet(this, _Money_subunits, "f") * factorValue;
        const divisor = 10n ** scale;
        const result = __classPrivateFieldGet(_a, _a, "m", _Money_roundedDivide).call(_a, product, divisor);
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromSubunits).call(_a, result, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
    }
    /**
     * Allocate this amount proportionally.
     * Handles remainder distribution to avoid losing pennies.
     *
     * @param proportions - Array of proportions (e.g., [1, 1, 1] for three-way split)
     * @returns Array of Money objects that sum to the original amount
     */
    allocate(proportions) {
        if (!Array.isArray(proportions) || proportions.length === 0) {
            throw new TypeError('Proportions must be a non-empty array');
        }
        for (const p of proportions) {
            if (typeof p !== 'number' || !Number.isFinite(p) || p < 0) {
                throw new TypeError('All proportions must be non-negative finite numbers');
            }
        }
        const total = proportions.reduce((sum, p) => sum + p, 0);
        if (total <= 0) {
            throw new TypeError('Sum of proportions must be positive');
        }
        const totalSubunits = __classPrivateFieldGet(this, _Money_subunits, "f");
        // Calculate base allocations
        const allocations = proportions.map((p) => {
            return (totalSubunits * BigInt(Math.round(p * 1000000))) / BigInt(Math.round(total * 1000000));
        });
        // Distribute remainder
        let remainder = totalSubunits - allocations.reduce((sum, a) => sum + a, 0n);
        let i = 0;
        while (remainder > 0n) {
            allocations[i % allocations.length] += 1n;
            remainder -= 1n;
            i++;
        }
        while (remainder < 0n) {
            allocations[i % allocations.length] -= 1n;
            remainder += 1n;
            i++;
        }
        // Convert back to Money objects
        return allocations.map((subunits) => {
            return __classPrivateFieldGet(_a, _a, "m", _Money_createFromSubunits).call(_a, subunits, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
        });
    }
    // ============ Comparison Operations ============
    /**
     * Check if this amount equals another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    equalTo(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_subunits, "f") === __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is greater than another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    greaterThan(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_subunits, "f") > __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is less than another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    lessThan(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_subunits, "f") < __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is greater than or equal to another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    greaterThanOrEqual(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_subunits, "f") >= __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is less than or equal to another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    lessThanOrEqual(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_subunits, "f") <= __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is zero.
     */
    isZero() {
        return __classPrivateFieldGet(this, _Money_subunits, "f") === 0n;
    }
    /**
     * Check if this amount is positive (greater than zero).
     */
    isPositive() {
        return __classPrivateFieldGet(this, _Money_subunits, "f") > 0n;
    }
    /**
     * Check if this amount is negative (less than zero).
     */
    isNegative() {
        return __classPrivateFieldGet(this, _Money_subunits, "f") < 0n;
    }
    // ============ Serialization ============
    /**
     * Convert to a plain object (safe for JSON).
     */
    toJSON() {
        return {
            currency: this.currency,
            amount: this.amount,
        };
    }
    /**
     * Convert to string representation.
     */
    toString() {
        return `${this.amount} ${this.currency}`;
    }
    /**
     * Get the amount as a number (may lose precision for large values).
     * Use with caution - prefer string-based operations.
     */
    toNumber() {
        return Number(this.amount);
    }
    /**
     * Get the amount in subunits (e.g., cents for USD).
     * Useful for database storage (Stripe-style integer storage).
     */
    toSubunits() {
        return __classPrivateFieldGet(this, _Money_subunits, "f");
    }
    // ============ Static Factory Methods ============
    /**
     * Create a Money instance from a plain object.
     */
    static fromObject(obj) {
        return new _a(obj.currency, obj.amount);
    }
    /**
     * Create a Money instance from subunits (e.g., cents).
     * Useful for loading from database (Stripe-style integer storage).
     */
    static fromSubunits(subunits, currency) {
        const currencyDef = (0, currency_js_1.getCurrency)(currency);
        if (!currencyDef) {
            throw new errors_js_1.CurrencyUnknownError(currency);
        }
        const bigintSubunits = typeof subunits === 'number' ? BigInt(subunits) : subunits;
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromSubunits).call(_a, bigintSubunits, currency, currencyDef);
    }
    /**
     * Compare two Money objects (for use with Array.sort).
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    static compare(a, b) {
        if (a.currency !== b.currency) {
            throw new errors_js_1.CurrencyMismatchError(a.currency, b.currency);
        }
        const aVal = __classPrivateFieldGet(a, _Money_instances, "m", _Money_getInternalValue).call(a);
        const bVal = __classPrivateFieldGet(b, _Money_instances, "m", _Money_getInternalValue).call(b);
        if (aVal < bVal)
            return -1;
        if (aVal > bVal)
            return 1;
        return 0;
    }
    /**
     * Create a zero amount in the specified currency.
     */
    static zero(currency) {
        return new _a(currency, '0');
    }
}
exports.Money = Money;
_a = Money, _Money_subunits = new WeakMap(), _Money_currencyDef = new WeakMap(), _Money_instances = new WeakSet(), _Money_parseAmount = function _Money_parseAmount(amount) {
    const str = typeof amount === 'number' ? String(amount) : amount;
    const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!match) {
        throw new errors_js_1.AmountError(amount);
    }
    const [, sign, whole, frac = ''] = match;
    if (frac.length > __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits) {
        throw new errors_js_1.SubunitError(this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits);
    }
    const paddedFrac = frac.padEnd(__classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits, '0');
    const combined = BigInt(whole + paddedFrac);
    return sign === '-' ? -combined : combined;
}, _Money_assertSameCurrency = function _Money_assertSameCurrency(other) {
    if (this.currency !== other.currency) {
        throw new errors_js_1.CurrencyMismatchError(this.currency, other.currency);
    }
}, _Money_getInternalValue = function _Money_getInternalValue() {
    return __classPrivateFieldGet(this, _Money_subunits, "f");
}, _Money_parseFactor = function _Money_parseFactor(factor) {
    const str = String(factor);
    const [base, exponent] = str.split('e');
    const baseMatch = base.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!baseMatch) {
        // Fallback for unlikely cases, though String(number) should strictly produce valid formats
        throw new TypeError(`Invalid factor format: ${str}`);
    }
    const [, sign, whole, frac = ''] = baseMatch;
    const baseValue = BigInt((sign || '') + whole + frac);
    const baseDecimals = frac.length;
    const exp = exponent ? Number(exponent) : 0;
    const netExp = exp - baseDecimals;
    if (netExp >= 0) {
        return { value: baseValue * 10n ** BigInt(netExp), scale: 0n };
    }
    else {
        return { value: baseValue, scale: BigInt(-netExp) };
    }
}, _Money_roundedDivide = function _Money_roundedDivide(numerator, denominator) {
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
}, _Money_createFromSubunits = function _Money_createFromSubunits(subunits, currency, currencyDef) {
    return new _a(currency, __classPrivateFieldGet(_a, _a, "m", _Money_formatSubunits).call(_a, subunits, currencyDef));
}, _Money_formatSubunits = function _Money_formatSubunits(subunits, currencyDef) {
    const decimals = currencyDef.decimalDigits;
    const abs = subunits < 0n ? -subunits : subunits;
    const isNegative = subunits < 0n;
    if (decimals === 0) {
        return `${isNegative ? '-' : ''}${abs}`;
    }
    const multiplier = 10n ** BigInt(decimals);
    const wholePart = abs / multiplier;
    const fracPart = abs % multiplier;
    const sign = isNegative ? '-' : '';
    return `${sign}${wholePart}.${fracPart.toString().padStart(decimals, '0')}`;
};
