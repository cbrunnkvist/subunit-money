/**
 * Custom error types for Money operations.
 * All errors extend built-in Error types for proper instanceof checks.
 */

/**
 * Thrown when attempting operations between different currencies.
 * @example
 * new Money('USD', 10).add(new Money('EUR', 5)) // throws CurrencyMismatchError
 */
export class CurrencyMismatchError extends TypeError {
  readonly fromCurrency: string
  readonly toCurrency: string

  constructor(fromCurrency: string, toCurrency: string) {
    super(`Cannot operate on ${fromCurrency} and ${toCurrency} - currencies must match`)
    this.name = 'CurrencyMismatchError'
    this.fromCurrency = fromCurrency
    this.toCurrency = toCurrency
    Error.captureStackTrace?.(this, CurrencyMismatchError)
  }
}

/**
 * Thrown when using an unregistered currency code.
 * @example
 * new Money('FAKE', 10) // throws CurrencyUnknownError
 */
export class CurrencyUnknownError extends TypeError {
  readonly currency: string

  constructor(currency: string) {
    super(`Unknown currency '${currency}' - register it first with Money.registerCurrency()`)
    this.name = 'CurrencyUnknownError'
    this.currency = currency
    Error.captureStackTrace?.(this, CurrencyUnknownError)
  }
}

/**
 * Thrown when an amount has more decimal places than the currency allows.
 * @example
 * new Money('USD', '1.234') // throws SubunitError (USD only allows 2 decimals)
 */
export class SubunitError extends RangeError {
  readonly currency: string
  readonly maxDecimals: number

  constructor(currency: string, maxDecimals: number) {
    super(`${currency} only supports ${maxDecimals} decimal place(s)`)
    this.name = 'SubunitError'
    this.currency = currency
    this.maxDecimals = maxDecimals
    Error.captureStackTrace?.(this, SubunitError)
  }
}

/**
 * Thrown when an amount cannot be parsed as a valid number.
 * @example
 * new Money('USD', 'abc') // throws AmountError
 */
export class AmountError extends TypeError {
  readonly amount: unknown

  constructor(amount: unknown) {
    super(`Invalid amount: ${JSON.stringify(amount)}`)
    this.name = 'AmountError'
    this.amount = amount
    Error.captureStackTrace?.(this, AmountError)
  }
}

/**
 * Thrown when an exchange rate is not available.
 * @example
 * converter.convert(usdMoney, 'XYZ') // throws ExchangeRateError if no USD->XYZ rate
 */
export class ExchangeRateError extends Error {
  readonly fromCurrency: string
  readonly toCurrency: string

  constructor(fromCurrency: string, toCurrency: string) {
    super(`No exchange rate available from ${fromCurrency} to ${toCurrency}`)
    this.name = 'ExchangeRateError'
    this.fromCurrency = fromCurrency
    this.toCurrency = toCurrency
    Error.captureStackTrace?.(this, ExchangeRateError)
  }
}
