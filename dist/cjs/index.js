"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCurrencies = exports.loadCurrencyMap = exports.getAllCurrencies = exports.hasCurrency = exports.getCurrency = exports.registerCurrency = exports.ExchangeRateError = exports.AmountError = exports.SubunitError = exports.CurrencyUnknownError = exports.CurrencyMismatchError = exports.MoneyConverter = exports.ExchangeRateService = exports.Money = void 0;
// Core classes
var money_js_1 = require("./money.js");
Object.defineProperty(exports, "Money", { enumerable: true, get: function () { return money_js_1.Money; } });
var exchange_rate_service_js_1 = require("./exchange-rate-service.js");
Object.defineProperty(exports, "ExchangeRateService", { enumerable: true, get: function () { return exchange_rate_service_js_1.ExchangeRateService; } });
var money_converter_js_1 = require("./money-converter.js");
Object.defineProperty(exports, "MoneyConverter", { enumerable: true, get: function () { return money_converter_js_1.MoneyConverter; } });
// Error types
var errors_js_1 = require("./errors.js");
Object.defineProperty(exports, "CurrencyMismatchError", { enumerable: true, get: function () { return errors_js_1.CurrencyMismatchError; } });
Object.defineProperty(exports, "CurrencyUnknownError", { enumerable: true, get: function () { return errors_js_1.CurrencyUnknownError; } });
Object.defineProperty(exports, "SubunitError", { enumerable: true, get: function () { return errors_js_1.SubunitError; } });
Object.defineProperty(exports, "AmountError", { enumerable: true, get: function () { return errors_js_1.AmountError; } });
Object.defineProperty(exports, "ExchangeRateError", { enumerable: true, get: function () { return errors_js_1.ExchangeRateError; } });
// Currency utilities
var currency_js_1 = require("./currency.js");
Object.defineProperty(exports, "registerCurrency", { enumerable: true, get: function () { return currency_js_1.registerCurrency; } });
Object.defineProperty(exports, "getCurrency", { enumerable: true, get: function () { return currency_js_1.getCurrency; } });
Object.defineProperty(exports, "hasCurrency", { enumerable: true, get: function () { return currency_js_1.hasCurrency; } });
Object.defineProperty(exports, "getAllCurrencies", { enumerable: true, get: function () { return currency_js_1.getAllCurrencies; } });
Object.defineProperty(exports, "loadCurrencyMap", { enumerable: true, get: function () { return currency_js_1.loadCurrencyMap; } });
Object.defineProperty(exports, "clearCurrencies", { enumerable: true, get: function () { return currency_js_1.clearCurrencies; } });
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
const currency_js_2 = require("./currency.js");
const currencymap_json_1 = __importDefault(require("../currencymap.json"));
(0, currency_js_2.loadCurrencyMap)(currencymap_json_1.default);
