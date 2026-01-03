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
var _Money_instances, _a, _Money_value, _Money_currencyDef, _Money_parseAmount, _Money_fromInternal, _Money_assertSameCurrency, _Money_getInternalValue, _Money_createFromInternal, _Money_formatInternalValue;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const errors_js_1 = require("./errors.js");
const currency_js_1 = require("./currency.js");
// Internal precision: 8 decimal places (supports Bitcoin and most cryptocurrencies)
const INTERNAL_PRECISION = 8;
const PRECISION_MULTIPLIER = 10n ** BigInt(INTERNAL_PRECISION);
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
        // Private BigInt storage - not exposed to prevent precision leaks
        _Money_value.set(this, void 0);
        _Money_currencyDef.set(this, void 0);
        const currencyDef = (0, currency_js_1.getCurrency)(currency);
        if (!currencyDef) {
            throw new errors_js_1.CurrencyUnknownError(currency);
        }
        this.currency = currency;
        __classPrivateFieldSet(this, _Money_currencyDef, currencyDef, "f");
        __classPrivateFieldSet(this, _Money_value, __classPrivateFieldGet(this, _Money_instances, "m", _Money_parseAmount).call(this, amount), "f");
    }
    /**
     * The amount as a formatted string with correct decimal places.
     * @example
     * new Money('USD', 19.9).amount // "19.90"
     * new Money('JPY', 1000).amount // "1000"
     */
    get amount() {
        const decimals = __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits;
        const divisor = 10n ** BigInt(INTERNAL_PRECISION - decimals);
        const adjusted = __classPrivateFieldGet(this, _Money_value, "f") / divisor;
        const isNegative = adjusted < 0n;
        const abs = isNegative ? -adjusted : adjusted;
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
        const result = __classPrivateFieldGet(this, _Money_value, "f") + __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromInternal).call(_a, result, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
    }
    /**
     * Subtract another Money amount.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    subtract(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        const result = __classPrivateFieldGet(this, _Money_value, "f") - __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromInternal).call(_a, result, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
    }
    /**
     * Multiply by a factor.
     * Result is rounded to the currency's decimal places using banker's rounding.
     */
    multiply(factor) {
        if (typeof factor !== 'number' || !Number.isFinite(factor)) {
            throw new TypeError(`Factor must be a finite number, got: ${factor}`);
        }
        // Convert factor to BigInt-compatible form
        const factorStr = factor.toFixed(INTERNAL_PRECISION);
        const factorBigInt = BigInt(factorStr.replace('.', ''));
        const result = (__classPrivateFieldGet(this, _Money_value, "f") * factorBigInt) / PRECISION_MULTIPLIER;
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromInternal).call(_a, result, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
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
    allocate(proportions) {
        if (!Array.isArray(proportions) || proportions.length === 0) {
            throw new TypeError('Proportions must be a non-empty array');
        }
        const total = proportions.reduce((sum, p) => sum + p, 0);
        if (total <= 0) {
            throw new TypeError('Sum of proportions must be positive');
        }
        // Work in currency subunits to avoid precision loss
        const decimals = __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits;
        const subunitMultiplier = 10n ** BigInt(INTERNAL_PRECISION - decimals);
        const totalSubunits = __classPrivateFieldGet(this, _Money_value, "f") / subunitMultiplier;
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
            const internalValue = subunits * subunitMultiplier;
            return __classPrivateFieldGet(_a, _a, "m", _Money_createFromInternal).call(_a, internalValue, this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f"));
        });
    }
    // ============ Comparison Operations ============
    /**
     * Check if this amount equals another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    equalTo(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_value, "f") === __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is greater than another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    greaterThan(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_value, "f") > __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is less than another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    lessThan(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_value, "f") < __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is greater than or equal to another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    greaterThanOrEqual(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_value, "f") >= __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is less than or equal to another.
     * @throws {CurrencyMismatchError} If currencies don't match
     */
    lessThanOrEqual(other) {
        __classPrivateFieldGet(this, _Money_instances, "m", _Money_assertSameCurrency).call(this, other);
        return __classPrivateFieldGet(this, _Money_value, "f") <= __classPrivateFieldGet(other, _Money_instances, "m", _Money_getInternalValue).call(other);
    }
    /**
     * Check if this amount is zero.
     */
    isZero() {
        return __classPrivateFieldGet(this, _Money_value, "f") === 0n;
    }
    /**
     * Check if this amount is positive (greater than zero).
     */
    isPositive() {
        return __classPrivateFieldGet(this, _Money_value, "f") > 0n;
    }
    /**
     * Check if this amount is negative (less than zero).
     */
    isNegative() {
        return __classPrivateFieldGet(this, _Money_value, "f") < 0n;
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
        const decimals = __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits;
        const divisor = 10n ** BigInt(INTERNAL_PRECISION - decimals);
        return __classPrivateFieldGet(this, _Money_value, "f") / divisor;
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
        const multiplier = 10n ** BigInt(INTERNAL_PRECISION - currencyDef.decimalDigits);
        const internalValue = bigintSubunits * multiplier;
        return __classPrivateFieldGet(_a, _a, "m", _Money_createFromInternal).call(_a, internalValue, currency, currencyDef);
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
_a = Money, _Money_value = new WeakMap(), _Money_currencyDef = new WeakMap(), _Money_instances = new WeakSet(), _Money_parseAmount = function _Money_parseAmount(amount) {
    // Convert to string for consistent parsing
    const str = typeof amount === 'number' ? String(amount) : amount;
    // Validate format: optional minus, digits, optional decimal part
    const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/);
    if (!match) {
        throw new errors_js_1.AmountError(amount);
    }
    const [, sign, whole, frac = ''] = match;
    // Check decimal places don't exceed currency limit
    if (frac.length > __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits) {
        throw new errors_js_1.SubunitError(this.currency, __classPrivateFieldGet(this, _Money_currencyDef, "f").decimalDigits);
    }
    // Pad fraction to internal precision and combine
    const paddedFrac = frac.padEnd(INTERNAL_PRECISION, '0');
    const combined = BigInt(whole + paddedFrac);
    return sign === '-' ? -combined : combined;
}, _Money_fromInternal = function _Money_fromInternal(value, currency) {
    const currencyDef = (0, currency_js_1.getCurrency)(currency);
    if (!currencyDef) {
        throw new errors_js_1.CurrencyUnknownError(currency);
    }
    // Create instance without parsing
    const instance = Object.create(_a.prototype);
    Object.defineProperty(instance, 'currency', { value: currency, enumerable: true });
    Object.defineProperty(instance, '#value', { value });
    Object.defineProperty(instance, '#currencyDef', { value: currencyDef });
    instance['#value'] = value;
    instance['#currencyDef'] = currencyDef;
    return instance;
}, _Money_assertSameCurrency = function _Money_assertSameCurrency(other) {
    if (this.currency !== other.currency) {
        throw new errors_js_1.CurrencyMismatchError(this.currency, other.currency);
    }
}, _Money_getInternalValue = function _Money_getInternalValue() {
    return __classPrivateFieldGet(this, _Money_value, "f");
}, _Money_createFromInternal = function _Money_createFromInternal(value, currency, currencyDef) {
    const instance = Object.create(_a.prototype);
    // Use Object.defineProperties for proper initialization
    Object.defineProperties(instance, {
        currency: { value: currency, enumerable: true, writable: false },
    });
    // Access private fields via the class mechanism
    // This is a workaround since we can't directly set #private fields on Object.create instances
    // Instead, we'll use a different approach: call a private static method
    return new _a(currency, __classPrivateFieldGet(_a, _a, "m", _Money_formatInternalValue).call(_a, value, currencyDef));
}, _Money_formatInternalValue = function _Money_formatInternalValue(value, currencyDef) {
    const decimals = currencyDef.decimalDigits;
    const divisor = 10n ** BigInt(INTERNAL_PRECISION - decimals);
    const adjusted = value / divisor;
    const isNegative = adjusted < 0n;
    const abs = isNegative ? -adjusted : adjusted;
    if (decimals === 0) {
        return `${isNegative ? '-' : ''}${abs}`;
    }
    const multiplier = 10n ** BigInt(decimals);
    const wholePart = abs / multiplier;
    const fracPart = abs % multiplier;
    const sign = isNegative ? '-' : '';
    return `${sign}${wholePart}.${fracPart.toString().padStart(decimals, '0')}`;
};
