"use strict";
/**
 * Exchange Rate Service - Central authority for currency conversion rates.
 *
 * Design principles:
 * - Rates are stored as strings to preserve precision
 * - Timestamps track when rates were set
 * - Optional source tracking for audit trails
 * - Inverse rates can be auto-generated or explicitly set
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ExchangeRateService_instances, _ExchangeRateService_rates, _ExchangeRateService_key;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeRateService = void 0;
/**
 * Service for managing exchange rates between currencies.
 *
 * @example
 * const rates = new ExchangeRateService()
 * rates.setRate('USD', 'EUR', 0.92, 'ECB')
 * rates.getRate('USD', 'EUR') // { from: 'USD', to: 'EUR', rate: '0.92', ... }
 */
class ExchangeRateService {
    constructor() {
        _ExchangeRateService_instances.add(this);
        _ExchangeRateService_rates.set(this, new Map()
        /**
         * Create a rate key for storage.
         */
        );
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
    setRate(from, to, rate, source, autoInverse = true) {
        const rateStr = typeof rate === 'number' ? rate.toPrecision(15) : rate;
        __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").set(__classPrivateFieldGet(this, _ExchangeRateService_instances, "m", _ExchangeRateService_key).call(this, from, to), {
            from,
            to,
            rate: rateStr,
            timestamp: new Date(),
            source,
        });
        // Auto-create inverse rate if requested and not already explicitly set
        if (autoInverse) {
            const inverseKey = __classPrivateFieldGet(this, _ExchangeRateService_instances, "m", _ExchangeRateService_key).call(this, to, from);
            if (!__classPrivateFieldGet(this, _ExchangeRateService_rates, "f").has(inverseKey)) {
                const inverseRate = 1 / Number(rateStr);
                __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").set(inverseKey, {
                    from: to,
                    to: from,
                    rate: inverseRate.toPrecision(15),
                    timestamp: new Date(),
                    source: source ? `${source} (inverse)` : '(inverse)',
                });
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
    getRate(from, to) {
        // Same currency = rate of 1
        if (from === to) {
            return {
                from,
                to,
                rate: '1',
                timestamp: new Date(),
                source: '(identity)',
            };
        }
        return __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").get(__classPrivateFieldGet(this, _ExchangeRateService_instances, "m", _ExchangeRateService_key).call(this, from, to));
    }
    /**
     * Check if a rate exists.
     */
    hasRate(from, to) {
        return from === to || __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").has(__classPrivateFieldGet(this, _ExchangeRateService_instances, "m", _ExchangeRateService_key).call(this, from, to));
    }
    /**
     * Remove a rate.
     */
    removeRate(from, to) {
        return __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").delete(__classPrivateFieldGet(this, _ExchangeRateService_instances, "m", _ExchangeRateService_key).call(this, from, to));
    }
    /**
     * Get both forward and reverse rates, with discrepancy analysis.
     * Useful for detecting rate inconsistencies.
     *
     * @param currencyA - First currency
     * @param currencyB - Second currency
     * @returns Rate pair with discrepancy, or undefined if either rate is missing
     */
    getRatePair(currencyA, currencyB) {
        const forward = this.getRate(currencyA, currencyB);
        const reverse = this.getRate(currencyB, currencyA);
        if (!forward || !reverse) {
            return undefined;
        }
        // Calculate discrepancy: how far is forward * reverse from 1.0?
        const product = Number(forward.rate) * Number(reverse.rate);
        const discrepancy = Math.abs(1 - product);
        return { forward, reverse, discrepancy };
    }
    /**
     * Get all rates for a specific base currency.
     *
     * @param base - The base currency code
     * @returns Array of rates from this currency
     */
    getRatesFrom(base) {
        const rates = [];
        for (const rate of __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").values()) {
            if (rate.from === base) {
                rates.push(rate);
            }
        }
        return rates.sort((a, b) => a.to.localeCompare(b.to));
    }
    /**
     * Get all registered rates.
     */
    getAllRates() {
        return Array.from(__classPrivateFieldGet(this, _ExchangeRateService_rates, "f").values()).sort((a, b) => {
            const fromCompare = a.from.localeCompare(b.from);
            return fromCompare !== 0 ? fromCompare : a.to.localeCompare(b.to);
        });
    }
    /**
     * Clear all rates.
     */
    clear() {
        __classPrivateFieldGet(this, _ExchangeRateService_rates, "f").clear();
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
    loadRates(rates, source) {
        for (const [key, rate] of Object.entries(rates)) {
            const [from, to] = key.split(':');
            if (from && to) {
                this.setRate(from, to, rate, source, false); // Don't auto-inverse when batch loading
            }
        }
    }
}
exports.ExchangeRateService = ExchangeRateService;
_ExchangeRateService_rates = new WeakMap(), _ExchangeRateService_instances = new WeakSet(), _ExchangeRateService_key = function _ExchangeRateService_key(from, to) {
    return `${from}:${to}`;
};
