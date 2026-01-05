/**
 * subunit-money - A type-safe value object for monetary amounts
 *
 * @example
 * import { Money, ExchangeRateService, MoneyConverter } from '@cbrunnkvist/subunit-money'
 *
 * // Basic usage
 * const price = new Money('USD', '19.99')
 * const tax = price.multiply(0.08)
 * const total = price.add(tax)
 *
 * // Currency conversion
 * const rates = new ExchangeRateService()
 * rates.setRate('USD', 'EUR', 0.92)
 * const converter = new MoneyConverter(rates)
 * const euros = converter.convert(total, 'EUR')
 */
// Core classes
export { Money } from './money.js';
export { ExchangeRateService } from './exchange-rate-service.js';
export { MoneyConverter } from './money-converter.js';
// Error types
export { CurrencyMismatchError, CurrencyUnknownError, SubunitError, AmountError, ExchangeRateError, } from './errors.js';
// Currency utilities
export { registerCurrency, getCurrency, hasCurrency, getAllCurrencies, loadCurrencyMap, clearCurrencies, } from './currency.js';
// Auto-load default currencies
// The currencymap.json file is the official ISO 4217 currency list (List One) as of 2026-01-01,
// sourced from SIX Financial Information AG (the ISO 4217 Maintenance Agency).
//
// To regenerate:
//   1. Download list-one.xml from https://www.six-group.com/en/products-services/financial-information/data-standards.html
//   2. Convert with: yq -p xml -o json '.' list-one.xml | jq '.ISO_4217.CcyTbl.CcyNtry | map(select(.Ccy) | {(.Ccy): {decimal_digits: (if (.CcyMnrUnts == "N.A." or .CcyMnrUnts == null) then 0 else (.CcyMnrUnts | tonumber) end)}}) | add | to_entries | sort_by(.key) | from_entries' > currencymap.json
//
// Note: This excludes historical currencies, supranational funds, and precious metals,
// keeping only active national and regional currencies for practical use.
import { loadCurrencyMap } from './currency.js';
import currencyMap from '../currencymap.json';
loadCurrencyMap(currencyMap);
