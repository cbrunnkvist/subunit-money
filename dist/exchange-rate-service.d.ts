/**
 * Exchange Rate Service - Central authority for currency conversion rates.
 *
 * Design principles:
 * - Rates are stored as strings to preserve precision
 * - Timestamps track when rates were set
 * - Optional source tracking for audit trails
 * - Inverse rates can be auto-generated or explicitly set
 */
export interface ExchangeRate {
    from: string;
    to: string;
    rate: string;
    timestamp: Date;
    source?: string;
}
export interface RatePair {
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
export declare class ExchangeRateService {
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
