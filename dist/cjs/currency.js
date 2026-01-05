"use strict";
/**
 * Currency registry and types.
 * Manages ISO 4217 currency definitions and custom currencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCurrency = registerCurrency;
exports.getCurrency = getCurrency;
exports.hasCurrency = hasCurrency;
exports.getAllCurrencies = getAllCurrencies;
exports.loadCurrencyMap = loadCurrencyMap;
exports.clearCurrencies = clearCurrencies;
// Internal registry - mutable for registerCurrency()
const currencies = new Map();
/**
 * Register a new currency or update an existing one.
 * @param code - ISO 4217 currency code (e.g., 'USD', 'EUR', 'BTC')
 * @param decimalDigits - Number of decimal places (e.g., 2 for USD, 8 for BTC)
 */
function registerCurrency(code, decimalDigits) {
    currencies.set(code, { code, decimalDigits });
}
/**
 * Get a currency definition by code.
 * @returns The currency definition, or undefined if not registered
 */
function getCurrency(code) {
    return currencies.get(code);
}
/**
 * Check if a currency is registered.
 */
function hasCurrency(code) {
    return currencies.has(code);
}
/**
 * Get all registered currencies, sorted by code.
 */
function getAllCurrencies() {
    return Array.from(currencies.values()).sort((a, b) => a.code.localeCompare(b.code));
}
/**
 * Load currencies from the legacy currencymap.json format.
 * @param map - Object with currency codes as keys and {decimal_digits: number} as values
 */
function loadCurrencyMap(map) {
    for (const [code, data] of Object.entries(map)) {
        registerCurrency(code, data.decimal_digits);
    }
}
/**
 * Clear all registered currencies. Useful for testing.
 */
function clearCurrencies() {
    currencies.clear();
}
