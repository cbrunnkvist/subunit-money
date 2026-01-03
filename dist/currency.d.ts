/**
 * Currency registry and types.
 * Manages ISO 4217 currency definitions and custom currencies.
 */
export interface CurrencyDefinition {
    code: string;
    decimalDigits: number;
}
/**
 * Register a new currency or update an existing one.
 * @param code - ISO 4217 currency code (e.g., 'USD', 'EUR', 'BTC')
 * @param decimalDigits - Number of decimal places (e.g., 2 for USD, 8 for BTC)
 */
export declare function registerCurrency(code: string, decimalDigits: number): void;
/**
 * Get a currency definition by code.
 * @returns The currency definition, or undefined if not registered
 */
export declare function getCurrency(code: string): CurrencyDefinition | undefined;
/**
 * Check if a currency is registered.
 */
export declare function hasCurrency(code: string): boolean;
/**
 * Get all registered currencies, sorted by code.
 */
export declare function getAllCurrencies(): CurrencyDefinition[];
/**
 * Load currencies from the legacy currencymap.json format.
 * @param map - Object with currency codes as keys and {decimal_digits: number} as values
 */
export declare function loadCurrencyMap(map: Record<string, {
    decimal_digits: number;
}>): void;
/**
 * Clear all registered currencies. Useful for testing.
 */
export declare function clearCurrencies(): void;
