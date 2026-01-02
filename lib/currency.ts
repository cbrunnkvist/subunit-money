/**
 * Currency registry and types.
 * Manages ISO 4217 currency definitions and custom currencies.
 */

export interface CurrencyDefinition {
  code: string
  decimalDigits: number
}

// Internal registry - mutable for registerCurrency()
const currencies: Map<string, CurrencyDefinition> = new Map()

/**
 * Register a new currency or update an existing one.
 * @param code - ISO 4217 currency code (e.g., 'USD', 'EUR', 'BTC')
 * @param decimalDigits - Number of decimal places (e.g., 2 for USD, 8 for BTC)
 */
export function registerCurrency(code: string, decimalDigits: number): void {
  currencies.set(code, { code, decimalDigits })
}

/**
 * Get a currency definition by code.
 * @returns The currency definition, or undefined if not registered
 */
export function getCurrency(code: string): CurrencyDefinition | undefined {
  return currencies.get(code)
}

/**
 * Check if a currency is registered.
 */
export function hasCurrency(code: string): boolean {
  return currencies.has(code)
}

/**
 * Get all registered currencies, sorted by code.
 */
export function getAllCurrencies(): CurrencyDefinition[] {
  return Array.from(currencies.values()).sort((a, b) => a.code.localeCompare(b.code))
}

/**
 * Load currencies from the legacy currencymap.json format.
 * @param map - Object with currency codes as keys and {decimal_digits: number} as values
 */
export function loadCurrencyMap(map: Record<string, { decimal_digits: number }>): void {
  for (const [code, data] of Object.entries(map)) {
    registerCurrency(code, data.decimal_digits)
  }
}

/**
 * Clear all registered currencies. Useful for testing.
 */
export function clearCurrencies(): void {
  currencies.clear()
}
