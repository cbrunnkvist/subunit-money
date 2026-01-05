var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// lib/errors.ts
var CurrencyMismatchError = class _CurrencyMismatchError extends TypeError {
  constructor(fromCurrency, toCurrency) {
    super(`Cannot operate on ${fromCurrency} and ${toCurrency} - currencies must match`);
    this.name = "CurrencyMismatchError";
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;
    Error.captureStackTrace?.(this, _CurrencyMismatchError);
  }
};
var CurrencyUnknownError = class _CurrencyUnknownError extends TypeError {
  constructor(currency) {
    super(`Unknown currency '${currency}' - register it first with Money.registerCurrency()`);
    this.name = "CurrencyUnknownError";
    this.currency = currency;
    Error.captureStackTrace?.(this, _CurrencyUnknownError);
  }
};
var SubunitError = class _SubunitError extends RangeError {
  constructor(currency, maxDecimals) {
    super(`${currency} only supports ${maxDecimals} decimal place(s)`);
    this.name = "SubunitError";
    this.currency = currency;
    this.maxDecimals = maxDecimals;
    Error.captureStackTrace?.(this, _SubunitError);
  }
};
var AmountError = class _AmountError extends TypeError {
  constructor(amount) {
    super(`Invalid amount: ${JSON.stringify(amount)}`);
    this.name = "AmountError";
    this.amount = amount;
    Error.captureStackTrace?.(this, _AmountError);
  }
};
var ExchangeRateError = class _ExchangeRateError extends Error {
  constructor(fromCurrency, toCurrency) {
    super(`No exchange rate available from ${fromCurrency} to ${toCurrency}`);
    this.name = "ExchangeRateError";
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;
    Error.captureStackTrace?.(this, _ExchangeRateError);
  }
};

// lib/currency.ts
var currencies = /* @__PURE__ */ new Map();
function registerCurrency(code, decimalDigits, displayDecimals) {
  currencies.set(code, { code, decimalDigits, displayDecimals });
}
function getCurrency(code) {
  return currencies.get(code);
}
function hasCurrency(code) {
  return currencies.has(code);
}
function getAllCurrencies() {
  return Array.from(currencies.values()).sort((a, b) => a.code.localeCompare(b.code));
}
function loadCurrencyMap(map) {
  for (const [code, data] of Object.entries(map)) {
    registerCurrency(code, data.decimal_digits);
  }
}
function clearCurrencies() {
  currencies.clear();
}

// lib/money.ts
var _subunits, _currencyDef, _Money_instances, parseAmount_fn, _Money_static, formatForDisplay_fn, assertSameCurrency_fn, getInternalValue_fn, parseFactor_fn, roundedDivide_fn, createFromSubunits_fn, formatSubunits_fn;
var _Money = class _Money {
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
    __privateAdd(this, _Money_instances);
    // Private BigInt storage - stores currency native subunits directly
    __privateAdd(this, _subunits);
    __privateAdd(this, _currencyDef);
    var _a, _b;
    const currencyDef = getCurrency(currency);
    if (!currencyDef) {
      throw new CurrencyUnknownError(currency);
    }
    this.currency = currency;
    __privateSet(this, _currencyDef, currencyDef);
    __privateSet(this, _subunits, __privateMethod(this, _Money_instances, parseAmount_fn).call(this, amount));
    this.amount = __privateMethod(_a = _Money, _Money_static, formatSubunits_fn).call(_a, __privateGet(this, _subunits), currencyDef);
    this.formatted = __privateMethod(_b = _Money, _Money_static, formatForDisplay_fn).call(_b, this.amount, currencyDef);
  }
  /**
   * Custom console inspection for Node.js.
   * Shows the amount and currency instead of just the class name.
   */
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `Money { amount: '${this.formatted}', currency: '${this.currency}' }`;
  }
  // ============ Arithmetic Operations ============
  /**
   * Add another Money amount.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  add(other) {
    var _a, _b;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    const result = __privateGet(this, _subunits) + __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
    return __privateMethod(_b = _Money, _Money_static, createFromSubunits_fn).call(_b, result, this.currency, __privateGet(this, _currencyDef));
  }
  /**
   * Subtract another Money amount.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  subtract(other) {
    var _a, _b;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    const result = __privateGet(this, _subunits) - __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
    return __privateMethod(_b = _Money, _Money_static, createFromSubunits_fn).call(_b, result, this.currency, __privateGet(this, _currencyDef));
  }
  /**
   * Multiply by a factor.
   *
   * DESIGN: Rounds immediately after multiplication using banker's rounding
   * (round half-to-even). This prevents the "split penny problem".
   */
  multiply(factor) {
    var _a, _b, _c;
    if (typeof factor !== "number" || !Number.isFinite(factor)) {
      throw new TypeError(`Factor must be a finite number, got: ${factor}`);
    }
    const { value: factorValue, scale } = __privateMethod(_a = _Money, _Money_static, parseFactor_fn).call(_a, factor);
    const product = __privateGet(this, _subunits) * factorValue;
    const divisor = 10n ** scale;
    const result = __privateMethod(_b = _Money, _Money_static, roundedDivide_fn).call(_b, product, divisor);
    return __privateMethod(_c = _Money, _Money_static, createFromSubunits_fn).call(_c, result, this.currency, __privateGet(this, _currencyDef));
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
      throw new TypeError("Proportions must be a non-empty array");
    }
    for (const p of proportions) {
      if (typeof p !== "number" || !Number.isFinite(p) || p < 0) {
        throw new TypeError("All proportions must be non-negative finite numbers");
      }
    }
    const total = proportions.reduce((sum, p) => sum + p, 0);
    if (total <= 0) {
      throw new TypeError("Sum of proportions must be positive");
    }
    const totalSubunits = __privateGet(this, _subunits);
    const allocations = proportions.map((p) => {
      return totalSubunits * BigInt(Math.round(p * 1e6)) / BigInt(Math.round(total * 1e6));
    });
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
    return allocations.map((subunits) => {
      var _a;
      return __privateMethod(_a = _Money, _Money_static, createFromSubunits_fn).call(_a, subunits, this.currency, __privateGet(this, _currencyDef));
    });
  }
  // ============ Comparison Operations ============
  /**
   * Check if this amount equals another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  equalTo(other) {
    var _a;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    return __privateGet(this, _subunits) === __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
  }
  /**
   * Check if this amount is greater than another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  greaterThan(other) {
    var _a;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    return __privateGet(this, _subunits) > __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
  }
  /**
   * Check if this amount is less than another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  lessThan(other) {
    var _a;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    return __privateGet(this, _subunits) < __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
  }
  /**
   * Check if this amount is greater than or equal to another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  greaterThanOrEqual(other) {
    var _a;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    return __privateGet(this, _subunits) >= __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
  }
  /**
   * Check if this amount is less than or equal to another.
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  lessThanOrEqual(other) {
    var _a;
    __privateMethod(this, _Money_instances, assertSameCurrency_fn).call(this, other);
    return __privateGet(this, _subunits) <= __privateMethod(_a = other, _Money_instances, getInternalValue_fn).call(_a);
  }
  /**
   * Check if this amount is zero.
   */
  isZero() {
    return __privateGet(this, _subunits) === 0n;
  }
  /**
   * Check if this amount is positive (greater than zero).
   */
  isPositive() {
    return __privateGet(this, _subunits) > 0n;
  }
  /**
   * Check if this amount is negative (less than zero).
   */
  isNegative() {
    return __privateGet(this, _subunits) < 0n;
  }
  // ============ Serialization ============
  /**
   * Convert to a plain object (safe for JSON).
   */
  toJSON() {
    return {
      currency: this.currency,
      amount: this.amount
    };
  }
  /**
   * Convert to string representation.
   */
  toString() {
    return `${this.formatted} ${this.currency}`;
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
    return __privateGet(this, _subunits);
  }
  // ============ Static Factory Methods ============
  /**
   * Create a Money instance from a plain object.
   */
  static fromObject(obj) {
    return new _Money(obj.currency, obj.amount);
  }
  /**
   * Create a Money instance from subunits (e.g., cents).
   * Useful for loading from database (Stripe-style integer storage).
   */
  static fromSubunits(subunits, currency) {
    var _a;
    const currencyDef = getCurrency(currency);
    if (!currencyDef) {
      throw new CurrencyUnknownError(currency);
    }
    const bigintSubunits = typeof subunits === "number" ? BigInt(subunits) : subunits;
    return __privateMethod(_a = _Money, _Money_static, createFromSubunits_fn).call(_a, bigintSubunits, currency, currencyDef);
  }
  /**
   * Compare two Money objects (for use with Array.sort).
   * @throws {CurrencyMismatchError} If currencies don't match
   */
  static compare(a, b) {
    var _a, _b;
    if (a.currency !== b.currency) {
      throw new CurrencyMismatchError(a.currency, b.currency);
    }
    const aVal = __privateMethod(_a = a, _Money_instances, getInternalValue_fn).call(_a);
    const bVal = __privateMethod(_b = b, _Money_instances, getInternalValue_fn).call(_b);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  }
  /**
   * Create a zero amount in the specified currency.
   */
  static zero(currency) {
    return new _Money(currency, "0");
  }
};
_subunits = new WeakMap();
_currencyDef = new WeakMap();
_Money_instances = new WeakSet();
/**
 * Parse an amount into native subunits.
 */
parseAmount_fn = function(amount) {
  const str = typeof amount === "number" ? String(amount) : amount;
  const match = str.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new AmountError(amount);
  }
  const [, sign, whole, frac = ""] = match;
  if (frac.length > __privateGet(this, _currencyDef).decimalDigits) {
    throw new SubunitError(this.currency, __privateGet(this, _currencyDef).decimalDigits);
  }
  const paddedFrac = frac.padEnd(__privateGet(this, _currencyDef).decimalDigits, "0");
  const combined = BigInt(whole + paddedFrac);
  return sign === "-" ? -combined : combined;
};
_Money_static = new WeakSet();
formatForDisplay_fn = function(fullAmount, currencyDef) {
  const preferredDecimals = currencyDef.displayDecimals ?? currencyDef.decimalDigits;
  if (preferredDecimals === currencyDef.decimalDigits) {
    return fullAmount;
  }
  const [whole, frac = ""] = fullAmount.split(".");
  if (!frac) return whole;
  let trimmedFrac = frac.replace(/0+$/, "");
  if (trimmedFrac.length < preferredDecimals) {
    trimmedFrac = trimmedFrac.padEnd(preferredDecimals, "0");
  }
  if (trimmedFrac === "" && preferredDecimals === 0) {
    return whole;
  }
  return `${whole}.${trimmedFrac}`;
};
/**
 * Ensure another Money has the same currency.
 */
assertSameCurrency_fn = function(other) {
  if (this.currency !== other.currency) {
    throw new CurrencyMismatchError(this.currency, other.currency);
  }
};
/**
 * Get the internal BigInt value (for operations).
 */
getInternalValue_fn = function() {
  return __privateGet(this, _subunits);
};
parseFactor_fn = function(factor) {
  const str = String(factor);
  const [base, exponent] = str.split("e");
  const baseMatch = base.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!baseMatch) {
    throw new TypeError(`Invalid factor format: ${str}`);
  }
  const [, sign, whole, frac = ""] = baseMatch;
  const baseValue = BigInt((sign || "") + whole + frac);
  const baseDecimals = frac.length;
  const exp = exponent ? Number(exponent) : 0;
  const netExp = exp - baseDecimals;
  if (netExp >= 0) {
    return { value: baseValue * 10n ** BigInt(netExp), scale: 0n };
  } else {
    return { value: baseValue, scale: BigInt(-netExp) };
  }
};
roundedDivide_fn = function(numerator, denominator) {
  if (denominator === 1n) return numerator;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;
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
createFromSubunits_fn = function(subunits, currency, currencyDef) {
  var _a;
  return new _Money(currency, __privateMethod(_a = _Money, _Money_static, formatSubunits_fn).call(_a, subunits, currencyDef));
};
formatSubunits_fn = function(subunits, currencyDef) {
  const decimals = currencyDef.decimalDigits;
  const abs = subunits < 0n ? -subunits : subunits;
  const isNegative = subunits < 0n;
  if (decimals === 0) {
    return `${isNegative ? "-" : ""}${abs}`;
  }
  const multiplier = 10n ** BigInt(decimals);
  const wholePart = abs / multiplier;
  const fracPart = abs % multiplier;
  const sign = isNegative ? "-" : "";
  return `${sign}${wholePart}.${fracPart.toString().padStart(decimals, "0")}`;
};
__privateAdd(_Money, _Money_static);
var Money = _Money;

// lib/exchange-rate-service.ts
var _rates, _ExchangeRateService_instances, key_fn;
var ExchangeRateService = class {
  constructor() {
    __privateAdd(this, _ExchangeRateService_instances);
    __privateAdd(this, _rates, /* @__PURE__ */ new Map());
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
    const rateStr = typeof rate === "number" ? rate.toPrecision(15) : rate;
    __privateGet(this, _rates).set(__privateMethod(this, _ExchangeRateService_instances, key_fn).call(this, from, to), {
      from,
      to,
      rate: rateStr,
      timestamp: /* @__PURE__ */ new Date(),
      source
    });
    if (autoInverse) {
      const inverseKey = __privateMethod(this, _ExchangeRateService_instances, key_fn).call(this, to, from);
      if (!__privateGet(this, _rates).has(inverseKey)) {
        const inverseRate = 1 / Number(rateStr);
        __privateGet(this, _rates).set(inverseKey, {
          from: to,
          to: from,
          rate: inverseRate.toPrecision(15),
          timestamp: /* @__PURE__ */ new Date(),
          source: source ? `${source} (inverse)` : "(inverse)"
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
    if (from === to) {
      return {
        from,
        to,
        rate: "1",
        timestamp: /* @__PURE__ */ new Date(),
        source: "(identity)"
      };
    }
    return __privateGet(this, _rates).get(__privateMethod(this, _ExchangeRateService_instances, key_fn).call(this, from, to));
  }
  /**
   * Check if a rate exists.
   */
  hasRate(from, to) {
    return from === to || __privateGet(this, _rates).has(__privateMethod(this, _ExchangeRateService_instances, key_fn).call(this, from, to));
  }
  /**
   * Remove a rate.
   */
  removeRate(from, to) {
    return __privateGet(this, _rates).delete(__privateMethod(this, _ExchangeRateService_instances, key_fn).call(this, from, to));
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
      return void 0;
    }
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
    for (const rate of __privateGet(this, _rates).values()) {
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
    return Array.from(__privateGet(this, _rates).values()).sort((a, b) => {
      const fromCompare = a.from.localeCompare(b.from);
      return fromCompare !== 0 ? fromCompare : a.to.localeCompare(b.to);
    });
  }
  /**
   * Clear all rates.
   */
  clear() {
    __privateGet(this, _rates).clear();
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
      const [from, to] = key.split(":");
      if (from && to) {
        this.setRate(from, to, rate, source, false);
      }
    }
  }
};
_rates = new WeakMap();
_ExchangeRateService_instances = new WeakSet();
/**
 * Create a rate key for storage.
 */
key_fn = function(from, to) {
  return `${from}:${to}`;
};

// lib/money-converter.ts
var _rateService, _MoneyConverter_instances, bankersRound_fn;
var MoneyConverter = class {
  constructor(rateService) {
    __privateAdd(this, _MoneyConverter_instances);
    __privateAdd(this, _rateService);
    __privateSet(this, _rateService, rateService);
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
    const currencyDef = getCurrency(targetCurrency);
    if (!currencyDef) {
      throw new CurrencyUnknownError(targetCurrency);
    }
    const rate = __privateGet(this, _rateService).getRate(money.currency, targetCurrency);
    if (!rate) {
      throw new ExchangeRateError(money.currency, targetCurrency);
    }
    const sourceCurrencyDef = getCurrency(money.currency);
    const sourceSubunits = money.toSubunits();
    const sourceMultiplier = 10n ** BigInt(sourceCurrencyDef.decimalDigits);
    const targetMultiplier = 10n ** BigInt(currencyDef.decimalDigits);
    const RATE_PRECISION = 15n;
    const rateMultiplier = 10n ** RATE_PRECISION;
    const rateValue = Number(rate.rate);
    const rateBigInt = BigInt(Math.round(rateValue * Number(rateMultiplier)));
    const product = sourceSubunits * rateBigInt * targetMultiplier;
    const divisor = rateMultiplier * sourceMultiplier;
    const targetSubunits = __privateMethod(this, _MoneyConverter_instances, bankersRound_fn).call(this, product, divisor);
    return Money.fromSubunits(targetSubunits, targetCurrency);
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
    const partConverted = this.convert(part, whole.currency);
    return partConverted.toNumber() / whole.toNumber() * 100;
  }
  /**
   * Sum multiple Money amounts, converting all to a target currency.
   *
   * @param amounts - Array of Money objects (can be different currencies)
   * @param targetCurrency - Currency for the result
   * @returns Total in the target currency
   */
  sum(amounts, targetCurrency) {
    let total = Money.zero(targetCurrency);
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
    const bConverted = this.convert(b, a.currency);
    return Money.compare(a, bConverted);
  }
  /**
   * Get the exchange rate service (for direct rate access).
   */
  get rateService() {
    return __privateGet(this, _rateService);
  }
};
_rateService = new WeakMap();
_MoneyConverter_instances = new WeakSet();
bankersRound_fn = function(numerator, denominator) {
  if (denominator === 1n) return numerator;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;
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

// currencymap.json
var currencymap_default = {
  AED: {
    decimal_digits: 2
  },
  AFN: {
    decimal_digits: 2
  },
  ALL: {
    decimal_digits: 2
  },
  AMD: {
    decimal_digits: 2
  },
  AOA: {
    decimal_digits: 2
  },
  ARS: {
    decimal_digits: 2
  },
  AUD: {
    decimal_digits: 2
  },
  AWG: {
    decimal_digits: 2
  },
  AZN: {
    decimal_digits: 2
  },
  BAM: {
    decimal_digits: 2
  },
  BBD: {
    decimal_digits: 2
  },
  BDT: {
    decimal_digits: 2
  },
  BHD: {
    decimal_digits: 3
  },
  BIF: {
    decimal_digits: 0
  },
  BMD: {
    decimal_digits: 2
  },
  BND: {
    decimal_digits: 2
  },
  BOB: {
    decimal_digits: 2
  },
  BOV: {
    decimal_digits: 2
  },
  BRL: {
    decimal_digits: 2
  },
  BSD: {
    decimal_digits: 2
  },
  BTN: {
    decimal_digits: 2
  },
  BWP: {
    decimal_digits: 2
  },
  BYN: {
    decimal_digits: 2
  },
  BZD: {
    decimal_digits: 2
  },
  CAD: {
    decimal_digits: 2
  },
  CDF: {
    decimal_digits: 2
  },
  CHE: {
    decimal_digits: 2
  },
  CHF: {
    decimal_digits: 2
  },
  CHW: {
    decimal_digits: 2
  },
  CLF: {
    decimal_digits: 4
  },
  CLP: {
    decimal_digits: 0
  },
  CNY: {
    decimal_digits: 2
  },
  COP: {
    decimal_digits: 2
  },
  COU: {
    decimal_digits: 2
  },
  CRC: {
    decimal_digits: 2
  },
  CUP: {
    decimal_digits: 2
  },
  CVE: {
    decimal_digits: 2
  },
  CZK: {
    decimal_digits: 2
  },
  DJF: {
    decimal_digits: 0
  },
  DKK: {
    decimal_digits: 2
  },
  DOP: {
    decimal_digits: 2
  },
  DZD: {
    decimal_digits: 2
  },
  EGP: {
    decimal_digits: 2
  },
  ERN: {
    decimal_digits: 2
  },
  ETB: {
    decimal_digits: 2
  },
  EUR: {
    decimal_digits: 2
  },
  FJD: {
    decimal_digits: 2
  },
  FKP: {
    decimal_digits: 2
  },
  GBP: {
    decimal_digits: 2
  },
  GEL: {
    decimal_digits: 2
  },
  GHS: {
    decimal_digits: 2
  },
  GIP: {
    decimal_digits: 2
  },
  GMD: {
    decimal_digits: 2
  },
  GNF: {
    decimal_digits: 0
  },
  GTQ: {
    decimal_digits: 2
  },
  GYD: {
    decimal_digits: 2
  },
  HKD: {
    decimal_digits: 2
  },
  HNL: {
    decimal_digits: 2
  },
  HTG: {
    decimal_digits: 2
  },
  HUF: {
    decimal_digits: 2
  },
  IDR: {
    decimal_digits: 2
  },
  ILS: {
    decimal_digits: 2
  },
  INR: {
    decimal_digits: 2
  },
  IQD: {
    decimal_digits: 3
  },
  IRR: {
    decimal_digits: 2
  },
  ISK: {
    decimal_digits: 0
  },
  JMD: {
    decimal_digits: 2
  },
  JOD: {
    decimal_digits: 3
  },
  JPY: {
    decimal_digits: 0
  },
  KES: {
    decimal_digits: 2
  },
  KGS: {
    decimal_digits: 2
  },
  KHR: {
    decimal_digits: 2
  },
  KMF: {
    decimal_digits: 0
  },
  KPW: {
    decimal_digits: 2
  },
  KRW: {
    decimal_digits: 0
  },
  KWD: {
    decimal_digits: 3
  },
  KYD: {
    decimal_digits: 2
  },
  KZT: {
    decimal_digits: 2
  },
  LAK: {
    decimal_digits: 2
  },
  LBP: {
    decimal_digits: 2
  },
  LKR: {
    decimal_digits: 2
  },
  LRD: {
    decimal_digits: 2
  },
  LSL: {
    decimal_digits: 2
  },
  LYD: {
    decimal_digits: 3
  },
  MAD: {
    decimal_digits: 2
  },
  MDL: {
    decimal_digits: 2
  },
  MGA: {
    decimal_digits: 2
  },
  MKD: {
    decimal_digits: 2
  },
  MMK: {
    decimal_digits: 2
  },
  MNT: {
    decimal_digits: 2
  },
  MOP: {
    decimal_digits: 2
  },
  MRU: {
    decimal_digits: 2
  },
  MUR: {
    decimal_digits: 2
  },
  MVR: {
    decimal_digits: 2
  },
  MWK: {
    decimal_digits: 2
  },
  MXN: {
    decimal_digits: 2
  },
  MXV: {
    decimal_digits: 2
  },
  MYR: {
    decimal_digits: 2
  },
  MZN: {
    decimal_digits: 2
  },
  NAD: {
    decimal_digits: 2
  },
  NGN: {
    decimal_digits: 2
  },
  NIO: {
    decimal_digits: 2
  },
  NOK: {
    decimal_digits: 2
  },
  NPR: {
    decimal_digits: 2
  },
  NZD: {
    decimal_digits: 2
  },
  OMR: {
    decimal_digits: 3
  },
  PAB: {
    decimal_digits: 2
  },
  PEN: {
    decimal_digits: 2
  },
  PGK: {
    decimal_digits: 2
  },
  PHP: {
    decimal_digits: 2
  },
  PKR: {
    decimal_digits: 2
  },
  PLN: {
    decimal_digits: 2
  },
  PYG: {
    decimal_digits: 0
  },
  QAR: {
    decimal_digits: 2
  },
  RON: {
    decimal_digits: 2
  },
  RSD: {
    decimal_digits: 2
  },
  RUB: {
    decimal_digits: 2
  },
  RWF: {
    decimal_digits: 0
  },
  SAR: {
    decimal_digits: 2
  },
  SBD: {
    decimal_digits: 2
  },
  SCR: {
    decimal_digits: 2
  },
  SDG: {
    decimal_digits: 2
  },
  SEK: {
    decimal_digits: 2
  },
  SGD: {
    decimal_digits: 2
  },
  SHP: {
    decimal_digits: 2
  },
  SLE: {
    decimal_digits: 2
  },
  SOS: {
    decimal_digits: 2
  },
  SRD: {
    decimal_digits: 2
  },
  SSP: {
    decimal_digits: 2
  },
  STN: {
    decimal_digits: 2
  },
  SVC: {
    decimal_digits: 2
  },
  SYP: {
    decimal_digits: 2
  },
  SZL: {
    decimal_digits: 2
  },
  THB: {
    decimal_digits: 2
  },
  TJS: {
    decimal_digits: 2
  },
  TMT: {
    decimal_digits: 2
  },
  TND: {
    decimal_digits: 3
  },
  TOP: {
    decimal_digits: 2
  },
  TRY: {
    decimal_digits: 2
  },
  TTD: {
    decimal_digits: 2
  },
  TWD: {
    decimal_digits: 2
  },
  TZS: {
    decimal_digits: 2
  },
  UAH: {
    decimal_digits: 2
  },
  UGX: {
    decimal_digits: 0
  },
  USD: {
    decimal_digits: 2
  },
  USN: {
    decimal_digits: 2
  },
  UYI: {
    decimal_digits: 0
  },
  UYU: {
    decimal_digits: 2
  },
  UYW: {
    decimal_digits: 4
  },
  UZS: {
    decimal_digits: 2
  },
  VED: {
    decimal_digits: 2
  },
  VES: {
    decimal_digits: 2
  },
  VND: {
    decimal_digits: 0
  },
  VUV: {
    decimal_digits: 0
  },
  WST: {
    decimal_digits: 2
  },
  XAD: {
    decimal_digits: 2
  },
  XAF: {
    decimal_digits: 0
  },
  XAG: {
    decimal_digits: 0
  },
  XAU: {
    decimal_digits: 0
  },
  XBA: {
    decimal_digits: 0
  },
  XBB: {
    decimal_digits: 0
  },
  XBC: {
    decimal_digits: 0
  },
  XBD: {
    decimal_digits: 0
  },
  XCD: {
    decimal_digits: 2
  },
  XCG: {
    decimal_digits: 2
  },
  XDR: {
    decimal_digits: 0
  },
  XOF: {
    decimal_digits: 0
  },
  XPD: {
    decimal_digits: 0
  },
  XPF: {
    decimal_digits: 0
  },
  XPT: {
    decimal_digits: 0
  },
  XSU: {
    decimal_digits: 0
  },
  XTS: {
    decimal_digits: 0
  },
  XUA: {
    decimal_digits: 0
  },
  XXX: {
    decimal_digits: 0
  },
  YER: {
    decimal_digits: 2
  },
  ZAR: {
    decimal_digits: 2
  },
  ZMW: {
    decimal_digits: 2
  },
  ZWG: {
    decimal_digits: 2
  }
};

// lib/index.ts
loadCurrencyMap(currencymap_default);
export {
  AmountError,
  CurrencyMismatchError,
  CurrencyUnknownError,
  ExchangeRateError,
  ExchangeRateService,
  Money,
  MoneyConverter,
  SubunitError,
  clearCurrencies,
  getAllCurrencies,
  getCurrency,
  hasCurrency,
  loadCurrencyMap,
  registerCurrency
};
//# sourceMappingURL=index.js.map