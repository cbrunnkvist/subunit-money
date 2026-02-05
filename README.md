# subunit-money

A _TypeScript-first_ [value object](https://martinfowler.com/bliki/ValueObject.html) for dealing with money and currencies. Uses _currency subunits_ (cents, pence, etc.) internally, via BigInt, for precision-safe calculations.

> **Note**: This is a complete TypeScript rewrite of [`cbrunnkvist/es-money`](https://github.com/cbrunnkvist/es-money), modernized with BigInt internals, enhanced type safety, and currency conversion support.

## Basic Usage

```typescript
import { Money } from 'subunit-money'

const price = new Money('USD', '19.99')
const tax = price.multiply(0.0825)
const total = price.add(tax)

console.log(total.toString()) // "21.64 USD"
console.log(total.amount)     // "21.64" (string, safe for JSON/DB)
console.log(total.toNumber()) // 21.64 (number, for calculations)
```

## Why Model Money as a Value Object?

Naive JavaScript math fails for monetary values in subtle but critical ways:

**Floating-Point Errors**: JavaScript represents decimals in binary, so values like 19.99 are approximations. Operations on approximations compound the error.

**Deferred Rounding**: The classic example is `0.1 + 0.2 === 0.3` returning `false`. But in accounting, deferred rounding is worse—you might accumulate errors silently across many transactions.

**The Split Penny Problem**: Imagine charging tax ($1.649175) on 10 items. If you round per-item (legally required on receipts), that's $1.65 × 10 = $16.50. But if you defer rounding, 10 × $1.649175 = $16.49. That missing penny is a real problem. Money objects round immediately after multiplication to prevent this.

**Banker's Rounding**: When a value is exactly halfway (like $0.545), should it round up or down? Simple "round half up" always rounds up, creating systematic bias—over millions of transactions, you're consistently overcharging. This library uses "round half to even" (banker's rounding): $0.545 rounds to $0.54 (4 is even), but $0.555 rounds to $0.56 (5 is odd, round to even 6). This eliminates bias and is the IEEE 754-2008 standard for financial calculations.

This library uses BigInt internally to store currency in subunits (cents, satoshis, etc.), making all arithmetic exact.

## Features

- **Precision-safe**: BigInt internals prevent floating-point errors (`0.1 + 0.2` works correctly)
- **Type-safe**: Full TypeScript support with currency-branded types
- **Immutable**: All operations return new instances
- **Serialization-safe**: String amounts survive JSON/database round-trips
- **Zero dependencies**: Just Node.js 18+
- **Cryptocurrency ready**: Supports arbitrary decimal places (tested up to 30 for XNO/Nano)

## Installation

```bash
npm install subunit-money
```

## API Reference

### Creating Money

```typescript
// From string (recommended)
new Money('USD', '100.00')

// From number
new Money('USD', 100)

// From subunits (e.g., cents from database)
Money.fromSubunits(10000n, 'USD') // $100.00

// Zero amount
Money.zero('EUR') // 0.00 EUR

// From plain object (e.g., from JSON)
Money.fromObject({ currency: 'USD', amount: '50.00' })
```

### Arithmetic

```typescript
const a = new Money('USD', '100.00')
const b = new Money('USD', '25.00')

a.add(b)        // 125.00 USD
a.subtract(b)   // 75.00 USD
a.multiply(1.5) // 150.00 USD

// Allocate proportionally (never loses cents)
a.allocate([70, 30]) // [70.00 USD, 30.00 USD]
a.allocate([1, 1, 1]) // [33.34 USD, 33.33 USD, 33.33 USD]
```

### Comparisons

```typescript
const a = new Money('USD', '100.00')
const b = new Money('USD', '50.00')

a.equalTo(b)     // false
a.greaterThan(b) // true
a.lessThan(b)    // false
 a.greaterThanOrEqual(b) // true
 a.lessThanOrEqual(b)    // false
a.isZero()       // false
a.isPositive()   // true
a.isNegative()   // false

// For sorting
Money.compare(a, b) // 1 (positive = a > b)
[b, a].sort(Money.compare) // [50.00, 100.00]
```

### Serialization

```typescript
const money = new Money('USD', '99.99')

// For JSON APIs
money.toJSON()     // { currency: 'USD', amount: '99.99' }
JSON.stringify(money) // '{"currency":"USD","amount":"99.99"}'

// For display
money.toString()   // "99.99 USD"

// For database storage (as integer)
money.toSubunits() // 9999n (BigInt)
```

## Currency Conversion

For cross-currency operations, use `ExchangeRateService` and `MoneyConverter`:

```typescript
import { Money, ExchangeRateService, MoneyConverter } from 'subunit-money'

// Set up exchange rates
const rates = new ExchangeRateService()
rates.setRate('USD', 'EUR', '0.92')
rates.setRate('USD', 'GBP', '0.79')

// Create converter
const converter = new MoneyConverter(rates)

// Convert currencies
const dollars = new Money('USD', '100.00')
const euros = converter.convert(dollars, 'EUR')
console.log(euros.toString()) // "92.00 EUR"

// Cross-currency arithmetic
const usd = new Money('USD', '100.00')
const eur = new Money('EUR', '50.00')
const total = converter.add(usd, eur, 'USD') // Sum in USD

// Sum multiple currencies
const amounts = [
  new Money('USD', '100.00'),
  new Money('EUR', '50.00'),
  new Money('GBP', '25.00')
]
converter.sum(amounts, 'USD') // Total in USD
```

### Exchange Rate Features

```typescript
// Inverse rates are auto-created
rates.setRate('USD', 'EUR', '0.92')
rates.getRate('EUR', 'USD') // Returns ~1.087 automatically

// You can disable auto-inverse if you want to set both directions explicitly
rates.setRate('EUR', 'USD', '1.10', undefined, false) // Won't auto-create USD→EUR
```

## Custom Currencies

The module includes 120+ currencies. Add custom ones:

```typescript
import { registerCurrency, Money } from 'subunit-money'

// Add cryptocurrency
registerCurrency('BTC', 8)
const bitcoin = new Money('BTC', '0.00010000')

// Add custom token
registerCurrency('POINTS', 0)
const points = new Money('POINTS', '500')
```

## Error Handling

All errors extend `Error` with specific types:

```typescript
import {
  CurrencyMismatchError, // Adding USD + EUR without converter
  CurrencyUnknownError,  // Unknown currency code
  SubunitError,          // Too many decimal places
  AmountError,           // Invalid amount format
  ExchangeRateError      // Missing exchange rate
} from 'subunit-money'

try {
  const usd = new Money('USD', '100.00')
  const eur = new Money('EUR', '50.00')
  usd.add(eur) // Throws CurrencyMismatchError
} catch (e) {
  if (e instanceof CurrencyMismatchError) {
    console.log(`Cannot mix ${e.fromCurrency} and ${e.toCurrency}`)
  }
}
```

## Design Philosophy

- **Minimal surface area**: A value object should be just a value object
- **Fail fast**: Errors thrown immediately, not silently propagated
- **No localization**: Formatting for display is your app's concern
- **Banker's rounding**: Uses IEEE 754-2008 round-half-to-even to eliminate systematic bias

## Why String Amounts?

The `amount` property returns a string to prevent accidental precision loss:

```typescript
const money = new Money('USD', '0.10')

// Safe: survives JSON round-trip
const json = JSON.stringify(money)
const restored = Money.fromObject(JSON.parse(json))
restored.equalTo(money) // true

// Safe: database storage
db.insert({ price: money.amount }) // "0.10"
const loaded = new Money('USD', row.price) // Works perfectly
```

Use `toNumber()` only when you explicitly need numeric calculations.

## Choosing the Right Money Library

**subunit-money** sits between currency.js (pragmatic but imprecise) and dinero.js (precise but ceremony-heavy). If you want BigInt precision with method-chaining ergonomics, and you're onboard with banker's rounding as the sensible default, this is your library.

See **[CHOOSING-A-MONEY-LIBRARY.md](./CHOOSING-A-MONEY-LIBRARY.md)** for a detailed comparison of JavaScript money/precision libraries.

## Requirements

- Node.js 18+
- TypeScript 5+ (for consumers using TypeScript)

## License

Copyright (c) 2016-2025 Conny Brunnkvist. Licensed under the [MIT License](./LICENSE)
## Display Formatting

The `displayAmount` property provides a display-friendly version of the amount:

```typescript
const money = new Money('USD', '100.00')
money.amount        // "100.00" (full precision, use for storage/calculations)
money.displayAmount // "100.00" (formatted for display, used by toString())
```

For most currencies, `amount` and `displayAmount` are identical. They differ when:
- Custom `displayDecimals` is set via `registerCurrency()`
- Trailing zeros are trimmed for cleaner display

Use `amount` for data storage and precision-critical operations. Use `displayAmount` (or `toString()`) for user-facing output.
